import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MoreVertical, Pin, X, BellOff, Bell, Shield, Ban, ShieldX, ChevronLeft, ChevronRight, User, Trash2, Users, LogOut } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'

import type { Media } from '@/services/media.service'
import type { GroupMember } from '@/lib/api'

interface Reaction {
  emoji: string
  count: number
}

interface Message {
  id: string
  content: string
  timestamp: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
  isPinned?: boolean
  isDeleted?: boolean
  reactions?: Reaction[]
  media?: Media | null
  senderId?: string
}

interface ChatThreadProps {
  username: string
  avatarUrl?: string | null
  isGroup?: boolean
  memberCount?: number | null
  members?: GroupMember[] | null
  conversationId?: string | null
  messages: Message[]
  onSendMessage: (message: string, mediaId?: string | null) => void
  onBack?: () => void
  showBackButton?: boolean
  isOnline?: boolean
  lastSeen?: string // ISO timestamp
  status?: 'pending' | 'accepted' | 'declined'
  createdById?: string
  currentUserId?: string
  onAcceptRequest?: () => void
  onDeclineRequest?: () => void
  isLoadingMessages?: boolean
  onDeleteMessage?: (messageId: string) => void
  onPinMessage?: (messageId: string) => void
  onReactToMessage?: (messageId: string, emoji: string) => void
  onDeleteConversation?: () => void
  onMuteConversation?: () => void
  onBlockUser?: () => void
  onViewProfile?: () => void
  onOpenGroupInfo?: () => void
  onLeaveGroup?: () => void
  onDeleteGroup?: () => void
  onScrollToMessage?: (scrollFn: (messageId: string) => void) => void
  isMuted?: boolean
  isBlocked?: boolean
  isBlockedByMe?: boolean
  isBlockedByThem?: boolean
}

function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return 'Offline'
  
  const now = new Date()
  const lastSeenDate = new Date(lastSeen)
  const diffMs = now.getTime() - lastSeenDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Last seen just now'
  if (diffMins < 60) return `Last seen ${diffMins}m ago`
  if (diffHours < 24) return `Last seen ${diffHours}h ago`
  if (diffDays === 1) return 'Last seen yesterday'
  if (diffDays < 7) return `Last seen ${diffDays}d ago`
  return 'Last seen a while ago'
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

export function ChatThread({
  username,
  avatarUrl,
  isGroup = false,
  memberCount,
  members,
  conversationId,
  messages,
  onSendMessage,
  onBack,
  showBackButton = false,
  isOnline = false,
  lastSeen,
  status,
  createdById,
  currentUserId,
  onAcceptRequest,
  onDeclineRequest,
  isLoadingMessages = false,
  onDeleteMessage,
  onPinMessage,
  onReactToMessage,
  onDeleteConversation,
  onMuteConversation,
  onBlockUser,
  onViewProfile,
  onOpenGroupInfo,
  onLeaveGroup,
  onDeleteGroup,
  onScrollToMessage,
  isMuted = false,
  isBlocked = false,
  isBlockedByMe = false,
  isBlockedByThem = false
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const lastConversationIdRef = useRef<string | null | undefined>(undefined)
  const hasInitialScrolledRef = useRef(false)
  // Build once per render: senderId -> member metadata. Lets bubbles look up
  // the sender's name/avatar without an extra API call per message.
  const memberLookup = useMemo(() => {
    const m = new Map<string, GroupMember>()
    for (const member of members || []) m.set(member.user_id, member)
    return m
  }, [members])
  const [showPinnedBanner, setShowPinnedBanner] = useState(true)
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0)

  const isRequester = createdById === currentUserId
  const isGroupAdmin = isGroup && !!currentUserId &&
    (members || []).some((m) => m.user_id === currentUserId && m.role === 'admin')
  const isPending = status === 'pending'
  const activeStatus = isGroup
    ? (typeof memberCount === 'number' ? `${memberCount} member${memberCount === 1 ? '' : 's'}` : 'Group chat')
    : isBlocked
    ? 'Unavailable'
    : isOnline
    ? 'Active now'
    : formatLastSeen(lastSeen)
  const isRecipient = isPending && !isRequester
  
  // Get pinned messages (sorted by timestamp, newest first)
  const pinnedMessages = messages
    .filter(m => m.isPinned && !m.isDeleted)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      element.classList.add('highlight-message')
      setTimeout(() => {
        element.classList.remove('highlight-message')
      }, 2000)
    }
  }

  // Expose scrollToMessage function to parent
  useEffect(() => {
    if (onScrollToMessage) {
      onScrollToMessage(scrollToMessage)
    }
  }, [onScrollToMessage])

  const handleNextPinned = () => {
    if (currentPinnedIndex < pinnedMessages.length - 1) {
      setCurrentPinnedIndex(currentPinnedIndex + 1)
    }
  }

  const handlePrevPinned = () => {
    if (currentPinnedIndex > 0) {
      setCurrentPinnedIndex(currentPinnedIndex - 1)
    }
  }

  const handlePinnedBannerClick = () => {
    if (pinnedMessages.length > 0) {
      scrollToMessage(pinnedMessages[currentPinnedIndex].id)
    }
  }

  // Scroll-to-bottom behavior:
  // - First render of a conversation (or switching to a new one): jump instantly,
  //   pre-paint, so the user never sees the chat start at the top.
  // - Subsequent updates within the same conversation (new incoming/outgoing
  //   messages): smooth-scroll so they can follow new activity.
  //
  // We gate on !isLoadingMessages because the parent commits `messages` BEFORE
  // it flips the loading flag off — without this check the scroll fires while
  // the container is still rendering a spinner, and once the spinner is replaced
  // by the message list the effect won't re-run (deps unchanged), so the user
  // would land at the top of the chat.
  useLayoutEffect(() => {
    if (lastConversationIdRef.current !== conversationId) {
      lastConversationIdRef.current = conversationId
      hasInitialScrolledRef.current = false
    }

    if (isLoadingMessages) return

    const container = messagesContainerRef.current
    if (!container || messages.length === 0) return

    if (!hasInitialScrolledRef.current) {
      container.scrollTop = container.scrollHeight
      hasInitialScrolledRef.current = true

      // Re-pin to the bottom once any images in the thread finish loading —
      // they cause layout shift after the synchronous scroll otherwise and
      // leave the user a few hundred pixels short of the actual bottom.
      const imgs = Array.from(container.querySelectorAll('img'))
      const pending = imgs.filter((img) => !img.complete)
      pending.forEach((img) => {
        const settle = () => {
          if (lastConversationIdRef.current === conversationId) {
            container.scrollTop = container.scrollHeight
          }
        }
        img.addEventListener('load', settle, { once: true })
        img.addEventListener('error', settle, { once: true })
      })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, conversationId, isLoadingMessages])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Avatar
            username={username}
            avatarUrl={avatarUrl}
            size={40}
            online={!isGroup && isOnline && !isBlocked}
          />
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {username}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeStatus}
            </p>
          </div>
        </div>

        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
          align="end"
        >
          {isGroup ? (
            <>
              {onOpenGroupInfo && (
                <DropdownMenuItem onClick={onOpenGroupInfo}>
                  <Users className="h-4 w-4 mr-2" />
                  Group info
                </DropdownMenuItem>
              )}
              {onMuteConversation && (
                <DropdownMenuItem onClick={onMuteConversation}>
                  {isMuted ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onLeaveGroup && (
                <DropdownMenuItem onClick={onLeaveGroup} destructive>
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave group
                </DropdownMenuItem>
              )}
              {isGroupAdmin && onDeleteGroup && (
                <DropdownMenuItem onClick={onDeleteGroup} destructive>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete group
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <>
              {onViewProfile && (
                <DropdownMenuItem onClick={onViewProfile}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
              )}
              {onMuteConversation && (
                <DropdownMenuItem onClick={onMuteConversation}>
                  {isMuted ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDeleteConversation && (
                <DropdownMenuItem onClick={onDeleteConversation} destructive>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chat
                </DropdownMenuItem>
              )}
              {onBlockUser && (
                <DropdownMenuItem onClick={onBlockUser} destructive>
                  {isBlockedByMe ? (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Unblock
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Block
                    </>
                  )}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenu>
      </div>

      {isPending && isRequester && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
            ⏳ <strong>Message request sent.</strong> Waiting for {username} to accept your request.
          </p>
        </div>
      )}
      
      {isRecipient && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{username}</strong> wants to send you a message
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onAcceptRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4"
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeclineRequest}
                className="rounded-full px-4 border-slate-300 dark:border-slate-700"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && showPinnedBanner && (
        <div className="bg-blue-50 dark:bg-slate-800/50 border-b border-blue-100 dark:border-slate-700 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div 
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handlePinnedBannerClick}
            >
              <Pin className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-0.5">
                  {pinnedMessages.length > 1 
                    ? `Pinned Message ${currentPinnedIndex + 1}/${pinnedMessages.length}` 
                    : 'Pinned Message'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 truncate">
                  {pinnedMessages[currentPinnedIndex].content}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {pinnedMessages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPinned}
                    disabled={currentPinnedIndex === 0}
                    className="h-6 w-6 rounded-full hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={handleNextPinned}
                    disabled={currentPinnedIndex === pinnedMessages.length - 1}
                    className="h-6 w-6 rounded-full hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </button>
                </>
              )}
              <button
                onClick={() => setShowPinnedBanner(false)}
                className="h-6 w-6 rounded-full hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : messages.length > 0 ? (
          <div className="max-w-4xl mx-auto px-3 py-4">
            {messages.map((message, index) => {
              const showDateSeparator = index === 0 || 
                new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString()
              
              return (
                <div 
                  key={message.id}
                  ref={(el) => { messageRefs.current[message.id] = el }}
                  className="scroll-mt-4"
                >
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-white dark:bg-slate-800 shadow-sm px-3 py-1 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        {formatMessageDate(message.timestamp)}
                      </div>
                    </div>
                  )}
                  <MessageBubble
                    {...message}
                    senderName={
                      isGroup && message.senderId
                        ? memberLookup.get(message.senderId)?.username ?? null
                        : null
                    }
                    senderAvatarUrl={
                      isGroup && message.senderId
                        ? memberLookup.get(message.senderId)?.avatar_url ?? null
                        : null
                    }
                    showSenderHeader={isGroup}
                    onDelete={onDeleteMessage}
                    onPin={onPinMessage}
                    onReact={onReactToMessage}
                  />
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar
              username={username}
              avatarUrl={avatarUrl}
              size={64}
              className="mb-4"
            />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Start a conversation with {username}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Send a message to begin chatting
            </p>
          </div>
        )}
      </div>

      {/* Blocked Status Banner */}
      {isBlocked && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-red-50 dark:bg-red-900/20">
          {isBlockedByMe && (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
                <ShieldX className="h-4 w-4 flex-shrink-0" />
                <p>You have blocked {username}.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onBlockUser}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Unblock
              </Button>
            </div>
          )}
          {isBlockedByThem && (
            <div className="flex items-center justify-center gap-2 text-sm text-red-800 dark:text-red-300">
              <ShieldX className="h-4 w-4 flex-shrink-0" />
              <p>You cannot send messages to {username}.</p>
            </div>
          )}
        </div>
      )}

      {!isRecipient && !(isPending && isRequester && messages.length > 0) && !isBlocked && (
        <MessageInput onSendMessage={onSendMessage} />
      )}
      
      {isPending && isRequester && messages.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Waiting for {username} to accept your message request
          </p>
        </div>
      )}
      
      {isRecipient && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Accept the message request to start chatting
          </p>
        </div>
      )}
    </div>
  )
}
