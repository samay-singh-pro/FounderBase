import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConversationList } from './Messages/ConversationList'
import { ChatThread } from './Messages/ChatThread'
import { NewChatModal } from './Messages/NewChatModal'
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
}

interface ChatMessage {
  id: string
  content: string
  timestamp: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
}

interface Follower {
  id: string
  username: string
  isOnline: boolean
}

export default function MessagesPage() {
  const currentUser = useAuthStore((state) => state.user)
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

  const initDone = useRef(false)

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage, connectionError } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'message') {
        const conversationId = message.conversation_id

        const newMessage: ChatMessage = {
          id: message.id,
          content: message.content,
          timestamp: message.created_at,
          isSent: message.sender_id === currentUser?.id,
          isDelivered: true,
          isRead: message.is_read,
        }

        setConversationMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), newMessage],
        }))

        // Update last message in conversation list without full refresh
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: message.content, timestamp: message.created_at }
            : conv
        ))
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
      }))

      setConversationMessages(prev => ({
        ...prev,
        [conversationId]: transformed,
      }))
    } catch {
      // Silent fail
    } finally {
      setLoadingMessages(false)
    }
  }

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

  // Load followers when modal opens
  useEffect(() => {
    if (showNewChatModal) {
      loadFollowers()
    }
  }, [showNewChatModal])

  const loadFollowers = async () => {
    try {
      const response = await api.get('/api/v1/follows/following')
      const followingUsers = response.data

      const transformed: Follower[] = followingUsers.map((user: any) => ({
        id: user.id,
        username: user.username,
        isOnline: false,
      }))

      setFollowers(transformed)
    } catch {
      // Silent fail
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
    <div className="h-[calc(100vh-65px)] bg-slate-50 dark:bg-slate-950">
      <div className="h-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-full">
          <div className={`${activeConversationId ? 'hidden md:block' : 'block'} relative`}>
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

          <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
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
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                <MessageSquare className="h-20 w-20 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            )}
          </div>
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
    </div>
  )
}
