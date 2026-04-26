import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ConversationList } from './Messages/ConversationList'
import { ChatThread } from './Messages/ChatThread'
import { ChatInfo } from './Messages/ChatInfo'
import { NewChatModal } from './Messages/NewChatModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { MessageSquare } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { messageApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import api from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'

interface ConversationListItem {
  id: string
  username: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  lastSeen?: string // ISO timestamp of when user was last seen
  status?: 'pending' | 'accepted' | 'declined'
  createdById?: string
  otherUserId: string // Store the actual user ID for online status lookups
  isMuted?: boolean
  isBlocked?: boolean
  isBlockedByMe?: boolean
  isBlockedByThem?: boolean
}

interface ChatMessage {
  id: string
  content: string
  timestamp: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
  isPinned?: boolean
  isDeleted?: boolean
  reactions?: Array<{ emoji: string; count: number }>
}

interface Follower {
  id: string
  username: string
  isOnline: boolean
}

export default function MessagesPage() {
  const currentUser = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [requests, setRequests] = useState<ConversationListItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Record<string, ChatMessage[]>>({})
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [pendingRecipient, setPendingRecipient] = useState<{userId: string, username: string} | null>(null)
  const scrollToMessageFnRef = useRef<((messageId: string) => void) | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)

  const initDone = useRef(false)

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage, connectionError } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'message') {
        const conversationId = message.conversation_id
        const isMessageFromOther = message.sender_id !== currentUser?.id

        const newMessage: ChatMessage = {
          id: message.id,
          content: message.content,
          timestamp: message.created_at,
          isSent: message.sender_id === currentUser?.id,
          isDelivered: true,
          isRead: message.is_read,
          isPinned: message.is_pinned || false,
          isDeleted: message.is_deleted || false,
          reactions: message.reactions || [],
        }

        setConversationMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), newMessage],
        }))

        // Update last message in conversation list
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            // If conversation is active and message is from other user, keep unread count at 0
            // Otherwise increment it
            const isConversationActive = conversationId === activeConversationIdRef.current
            const newUnreadCount = (isConversationActive && isMessageFromOther) 
              ? 0 
              : (isMessageFromOther ? conv.unreadCount + 1 : conv.unreadCount)
            
            return { 
              ...conv, 
              lastMessage: message.content, 
              timestamp: message.created_at,
              unreadCount: newUnreadCount
            }
          }
          return conv
        }))

        // Mark message as read if this conversation is currently active and it's from the other user
        if (conversationId === activeConversationIdRef.current && isMessageFromOther) {
          api.post(`/api/v1/messages/conversations/${conversationId}/mark-read`).catch(err => {
            console.error('Failed to mark message as read:', err)
          })
        }
      } else if (message.type === 'online_status') {
        const userId = message.user_id
        const isOnline = message.is_online
        const lastSeen = message.last_seen

        setConversations(prev => prev.map(conv =>
          conv.otherUserId === userId
            ? { ...conv, isOnline, lastSeen: lastSeen || conv.lastSeen }
            : conv
        ))

        setRequests(prev => prev.map(conv =>
          conv.otherUserId === userId
            ? { ...conv, isOnline, lastSeen: lastSeen || conv.lastSeen }
            : conv
        ))
      }
    },
    onError: () => {
      // Silent fail
    }
  })

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    const userId = searchParams.get('userId')
    const username = searchParams.get('username')
    const conversationParam = searchParams.get('conversation')

    if (userId && username) {
      setSearchParams({}, { replace: true })
      initFromCard(userId, username)
    } else if (conversationParam) {
      setSearchParams({}, { replace: true })
      loadConversations().then(() => {
        setActiveConversationId(conversationParam)
      })
    } else {
      loadConversations()
    }
  }, [])

  const initFromCard = async (userId: string, username: string) => {
    try {
      const [conversationsData, checkResult] = await Promise.all([
        fetchAndTransformConversations(),
        messageApi.checkConversation(userId),
      ])

      applyConversations(conversationsData)

      if (checkResult.exists && checkResult.conversation_id) {
        setActiveConversationId(checkResult.conversation_id)
      } else {
        setPendingRecipient({ userId, username })
        setShowNewChatModal(true)
      }
    } catch {
      setPendingRecipient({ userId, username })
      setShowNewChatModal(true)
    } finally {
      setLoading(false)
    }
  }

  // Poll online status every 5 minutes as backup (primary updates via WebSocket)
  useEffect(() => {
    if (conversations.length === 0 && requests.length === 0) return

    const interval = setInterval(() => {
      updateOnlineStatus()
    }, 300000)

    return () => clearInterval(interval)
  }, [conversations.length, requests.length])

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (activeConversationId) {
      // Only show spinner if we have no cached messages for this conversation
      const hasCached = !!conversationMessages[activeConversationId]?.length
      loadMessages(activeConversationId, !hasCached)
    }
  }, [activeConversationId])

  const fetchAndTransformConversations = async () => {
    const [data, onlineStatus] = await Promise.all([
      messageApi.getConversations(),
      messageApi.getOnlineStatus(),
    ])

    const transformed: ConversationListItem[] = data.map(conv => {
      const otherUserId = conv.other_user_id
      const statusInfo = onlineStatus[otherUserId]
      return {
        id: conv.id,
        username: conv.other_user_username,
        lastMessage: conv.last_message || 'No messages yet',
        timestamp: conv.last_message_time || conv.created_at,
        unreadCount: conv.unread_count,
        isOnline: statusInfo?.is_online || false,
        lastSeen: statusInfo?.last_seen,
        status: conv.status,
        createdById: conv.created_by_id,
        otherUserId: otherUserId,
        isMuted: conv.is_muted || false,
        isBlocked: conv.is_blocked || false,
        isBlockedByMe: conv.is_blocked_by_me || false,
        isBlockedByThem: conv.is_blocked_by_them || false,
      }
    })

    return transformed
  }

  const applyConversations = (
    transformed: ConversationListItem[],
    autoSelect = false
  ) => {
    const acceptedConversations = transformed.filter(conv => conv.status === 'accepted')
    const pendingRequestsSent = transformed.filter(conv =>
      conv.status === 'pending' && conv.createdById === currentUser?.id
    )
    const pendingRequestsReceived = transformed.filter(conv =>
      conv.status === 'pending' && conv.createdById !== currentUser?.id
    )

    const messagesTabConversations = [...acceptedConversations, ...pendingRequestsSent]

    setConversations(messagesTabConversations)
    setRequests(pendingRequestsReceived)

    if (autoSelect && !activeConversationId && messagesTabConversations.length > 0) {
      setActiveConversationId(messagesTabConversations[0].id)
    }
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      const transformed = await fetchAndTransformConversations()
      applyConversations(transformed, true)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  const updateOnlineStatus = async () => {
    try {
      const onlineStatus = await messageApi.getOnlineStatus()

      setConversations(prev => prev.map(conv => {
        const status = onlineStatus[conv.otherUserId]
        return {
          ...conv,
          isOnline: status?.is_online || false,
          lastSeen: status?.last_seen || conv.lastSeen
        }
      }))

      setRequests(prev => prev.map(conv => {
        const status = onlineStatus[conv.otherUserId]
        return {
          ...conv,
          isOnline: status?.is_online || false,
          lastSeen: status?.last_seen || conv.lastSeen
        }
      }))
    } catch {
      // Silent fail
    }
  }

  const loadMessages = async (conversationId: string, showSpinner = true) => {
    try {
      if (showSpinner) setLoadingMessages(true)
      const data = await messageApi.getMessages(conversationId)

      const transformed: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.created_at,
        isSent: msg.sender_id === currentUser?.id,
        isDelivered: true,
        isRead: msg.is_read,
        isPinned: msg.is_pinned,
        isDeleted: msg.is_deleted,
        reactions: msg.reactions || [],
      }))

      setConversationMessages(prev => ({
        ...prev,
        [conversationId]: transformed,
      }))

      // Mark all messages in this conversation as read
      try {
        await api.post(`/api/v1/messages/conversations/${conversationId}/mark-read`)
        
        // Update unread count in conversation list to 0
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        ))
        setRequests(prev => prev.map(req => 
          req.id === conversationId ? { ...req, unreadCount: 0 } : req
        ))
      } catch (error) {
        console.error('Failed to mark messages as read:', error)
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingMessages(false)
    }
  }

  // Callback to receive scroll-to-message function from ChatThread
  const handleScrollToMessageCallback = useCallback((fn: (messageId: string) => void) => {
    scrollToMessageFnRef.current = fn
  }, [])

  const handleSendMessage = async (message: string) => {
    if (!activeConversationId || !message.trim() || !isConnected) return

    const success = wsSendMessage(activeConversationId, message)

    if (!success) {
      useToastStore.getState().error('Failed to send message. Please check your connection.')
    }
  }

  const handleNewChat = async (userId: string, username: string, message?: string) => {
    try {
      const conversation = message
        ? await messageApi.startConversation(userId, message)
        : await messageApi.createConversation(userId)

      setShowNewChatModal(false)
      setPendingRecipient(null)

      const newConv: ConversationListItem = {
        id: conversation.id,
        username: conversation.other_user_username || username,
        lastMessage: message || 'No messages yet',
        timestamp: conversation.created_at || new Date().toISOString(),
        unreadCount: 0,
        isOnline: false,
        status: (conversation.status as 'pending' | 'accepted' | 'declined') || 'pending',
        createdById: currentUser?.id,
        otherUserId: userId,
      }

      setConversations(prev => {
        if (prev.some(c => c.id === conversation.id)) return prev
        return [newConv, ...prev]
      })

      setActiveConversationId(conversation.id)

      if (message) {
        setConversationMessages(prev => ({
          ...prev,
          [conversation.id]: [{
            id: 'optimistic-' + Date.now(),
            content: message,
            timestamp: new Date().toISOString(),
            isSent: true,
            isDelivered: true,
            isRead: false,
          }],
        }))
      }
    } catch {
      useToastStore.getState().error('Failed to create conversation. Please try again.')
    }
  }

  const handleAcceptRequest = async () => {
    if (!activeConversationId) return

    try {
      await messageApi.acceptRequest(activeConversationId)

      const accepted = requests.find(r => r.id === activeConversationId)
      if (accepted) {
        const updated = { ...accepted, status: 'accepted' as const }
        setRequests(prev => prev.filter(r => r.id !== activeConversationId))
        setConversations(prev => [updated, ...prev])
      }
    } catch {
      loadConversations()
    }
  }

  const handleDeclineRequest = async () => {
    if (!activeConversationId) return

    try {
      await messageApi.declineRequest(activeConversationId)

      setRequests(prev => prev.filter(r => r.id !== activeConversationId))
      setActiveConversationId(null)
    } catch {
      loadConversations()
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversationId) return

    try {
      await messageApi.deleteMessage(messageId)

      // Update the message in local state
      setConversationMessages(prev => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map(msg =>
          msg.id === messageId
            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
            : msg
        ),
      }))

      useToastStore.getState().success('Message deleted')
    } catch (error: any) {
      useToastStore.getState().error(error.response?.data?.detail || 'Failed to delete message')
    }
  }

  const handlePinMessage = async (messageId: string) => {
    if (!activeConversationId) return

    try {
      const result = await messageApi.togglePinMessage(messageId)

      // Update the message in local state
      setConversationMessages(prev => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map(msg =>
          msg.id === messageId
            ? { ...msg, isPinned: result.is_pinned }
            : msg
        ),
      }))

      useToastStore.getState().success(result.is_pinned ? 'Message pinned' : 'Message unpinned')
    } catch (error: any) {
      useToastStore.getState().error(error.response?.data?.detail || 'Failed to pin message')
    }
  }

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return

    try {
      await messageApi.addReaction(messageId, emoji)

      // Fetch updated reactions for this message
      const reactions = await messageApi.getReactions(messageId)

      // Update the message reactions in local state
      setConversationMessages(prev => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map(msg =>
          msg.id === messageId
            ? { ...msg, reactions }
            : msg
        ),
      }))
    } catch (error: any) {
      useToastStore.getState().error(error.response?.data?.detail || 'Failed to add reaction')
    }
  }

  const handleDeleteConversation = () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteConversation = async () => {
    if (!activeConversationId) return

    try {
      await messageApi.deleteConversation(activeConversationId)

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== activeConversationId))
      setRequests(prev => prev.filter(req => req.id !== activeConversationId))
      setConversationMessages(prev => {
        const newMessages = { ...prev }
        delete newMessages[activeConversationId]
        return newMessages
      })

      setActiveConversationId(null)
      setShowDeleteDialog(false)
      useToastStore.getState().success('Conversation deleted')
    } catch (error: any) {
      setShowDeleteDialog(false)
      useToastStore.getState().error(error.response?.data?.detail || 'Failed to delete conversation')
    }
  }

  const handleMuteConversation = async () => {
    if (!activeConversationId) return

    const activeConv = conversations.find(c => c.id === activeConversationId) || 
                       requests.find(r => r.id === activeConversationId)
    
    if (!activeConv) return

    const isMuted = activeConv.isMuted || false

    try {
      let result
      if (isMuted) {
        // Unmute the conversation
        result = await messageApi.unmuteConversation(activeConversationId)
      } else {
        // Mute the conversation
        result = await messageApi.muteConversation(activeConversationId)
      }

      // Update local state
      setConversations(prev => prev.map(conv =>
        conv.id === activeConversationId
          ? { ...conv, isMuted: !isMuted }
          : conv
      ))
      setRequests(prev => prev.map(req =>
        req.id === activeConversationId
          ? { ...req, isMuted: !isMuted }
          : req
      ))

      useToastStore.getState().success(result.message)
    } catch (error: any) {
      useToastStore.getState().error(error.response?.data?.detail || `Failed to ${isMuted ? 'unmute' : 'mute'} conversation`)
    }
  }

  const handleBlockUser = () => {
    setShowBlockDialog(true)
  }

  const confirmBlockUser = async () => {
    if (!activeConversationId) return

    const activeConv = conversations.find(c => c.id === activeConversationId) || 
                       requests.find(r => r.id === activeConversationId)
    
    if (!activeConv) return

    const isCurrentlyBlocked = activeConv.isBlockedByMe || false

    try {
      let result
      if (isCurrentlyBlocked) {
        // Unblock the user
        result = await messageApi.unblockUser(activeConv.otherUserId)
        
        // Update local state - remove blocked status
        setConversations(prev => prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, isBlocked: false, isBlockedByMe: false, isBlockedByThem: false }
            : conv
        ))
        setRequests(prev => prev.map(req =>
          req.id === activeConversationId
            ? { ...req, isBlocked: false, isBlockedByMe: false, isBlockedByThem: false }
            : req
        ))
      } else {
        // Block the user
        result = await messageApi.blockUser(activeConv.otherUserId)
        
        // Update local state - mark as blocked
        setConversations(prev => prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, isBlocked: true, isBlockedByMe: true, isBlockedByThem: false }
            : conv
        ))
        setRequests(prev => prev.map(req =>
          req.id === activeConversationId
            ? { ...req, isBlocked: true, isBlockedByMe: true, isBlockedByThem: false }
            : req
        ))
      }

      setShowBlockDialog(false)
      useToastStore.getState().success(result.message)
      // Don't navigate away - stay in the conversation
    } catch (error: any) {
      setShowBlockDialog(false)
      useToastStore.getState().error(error.response?.data?.detail || `Failed to ${isCurrentlyBlocked ? 'unblock' : 'block'} user`)
    }
  }

  const handleViewProfile = () => {
    const activeConv = conversations.find(c => c.id === activeConversationId) || 
                       requests.find(r => r.id === activeConversationId)
    
    if (activeConv) {
      navigate(`/user/${activeConv.username}`)
    }
  }

  // Load followers when modal opens
  useEffect(() => {
    if (showNewChatModal) {
      loadFollowers()
    }
  }, [showNewChatModal])

  const loadFollowers = async () => {
    try {
      const response = await api.get('/api/v1/following')
      const followingUsers = response.data.following || []

      const transformed: Follower[] = followingUsers.map((user: any) => ({
        id: user.id,
        username: user.username,
        isOnline: false,
      }))

      setFollowers(transformed)
    } catch (error) {
      console.error('Failed to load followers:', error)
    }
  }

  const activeConversation = conversations.find(
    conv => conv.id === activeConversationId
  ) || requests.find(
    req => req.id === activeConversationId
  )

  if (loading) {
    return (
      <div className="h-[calc(100vh-65px)] bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 dark:bg-slate-950 bg-page-soft">
      <div className="h-full max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] xl:grid-cols-[380px_1fr_340px] h-full">
          <div className={`${activeConversationId ? 'hidden md:block' : 'block'} relative h-full overflow-hidden`}>
            <ConversationList
              conversations={conversations}
              requests={requests}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onNewChat={() => setShowNewChatModal(true)}
              requestsCount={requests.length}
            />

            {!isConnected && (
              <div className="absolute bottom-4 left-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
                {connectionError || 'Connecting to chat server...'}
              </div>
            )}
          </div>

          <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-col h-full overflow-hidden`}>
            {activeConversation && activeConversationId ? (
              <ChatThread
                username={activeConversation.username}
                messages={conversationMessages[activeConversationId] || []}
                onSendMessage={handleSendMessage}
                onBack={() => setActiveConversationId(null)}
                showBackButton={true}
                isOnline={activeConversation.isOnline}
                lastSeen={activeConversation.lastSeen}
                status={activeConversation.status}
                createdById={activeConversation.createdById}
                currentUserId={currentUser?.id}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
                isLoadingMessages={loadingMessages}
                onDeleteMessage={handleDeleteMessage}
                onPinMessage={handlePinMessage}
                onReactToMessage={handleReactToMessage}
                onDeleteConversation={handleDeleteConversation}
                onMuteConversation={handleMuteConversation}
                onBlockUser={handleBlockUser}
                onViewProfile={handleViewProfile}
                onScrollToMessage={handleScrollToMessageCallback}
                isMuted={activeConversation.isMuted}
                isBlocked={activeConversation.isBlocked}
                isBlockedByMe={activeConversation.isBlockedByMe}
                isBlockedByThem={activeConversation.isBlockedByThem}
              />
            ) : (
              <div className="relative flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="absolute inset-0 bg-dot-pattern opacity-60" />
                <div className="relative z-10 flex flex-col items-center text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-5">
                    <MessageSquare className="h-7 w-7 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">
                    Your conversations live here
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Select a conversation from the list, or start a new one.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chat Info Sidebar - Only visible on xl+ screens when a conversation is active */}
          {activeConversation && activeConversationId && (
            <div className="hidden xl:block h-full overflow-hidden">
              <ChatInfo
                username={activeConversation.username}
                userId={activeConversation.otherUserId}
                isOnline={activeConversation.isOnline}
                lastSeen={activeConversation.lastSeen}
                pinnedMessages={(conversationMessages[activeConversationId] || [])
                  .filter(m => m.isPinned && !m.isDeleted)
                  .map(m => ({
                    id: m.id,
                    content: m.content,
                    timestamp: m.timestamp
                  }))}
                onScrollToMessage={scrollToMessageFnRef.current || undefined}
                isMuted={activeConversation.isMuted}
                onMuteConversation={handleMuteConversation}
                isBlocked={activeConversation.isBlocked}
                isBlockedByMe={activeConversation.isBlockedByMe}
                isBlockedByThem={activeConversation.isBlockedByThem}
                onBlockUser={handleBlockUser}
              />
            </div>
          )}
        </div>
      </div>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false)
          setPendingRecipient(null)
        }}
        onSelectUser={handleNewChat}
        followers={followers}
        preselectedUser={pendingRecipient}
      />

      {/* Delete Conversation Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader onClose={() => setShowDeleteDialog(false)}>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteConversation}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock User Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader onClose={() => setShowBlockDialog(false)}>
            <DialogTitle>
              {activeConversation?.isBlockedByMe ? 'Unblock User' : 'Block User'}
            </DialogTitle>
            <DialogDescription>
              {activeConversation?.isBlockedByMe ? (
                `Are you sure you want to unblock ${activeConversation.username}? You will be able to receive messages from this user again.`
              ) : (
                `Are you sure you want to block ${activeConversation?.username}? You will no longer receive messages from this user.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBlockUser}
            >
              {activeConversation?.isBlockedByMe ? 'Unblock' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
