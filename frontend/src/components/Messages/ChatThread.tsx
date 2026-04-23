import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Message {
  id: string
  content: string
  timestamp: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
}

interface ChatThreadProps {
  username: string
  messages: Message[]
  onSendMessage: (message: string) => void
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
}

// Format relative time for "last seen"
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

export function ChatThread({ 
  username, 
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
  isLoadingMessages = false
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const avatarColor = getAvatarColor(username)

  // Determine if current user created this conversation (sent the request)
  const isRequester = createdById === currentUserId
  const isPending = status === 'pending'
  
  // Get active status text
  const activeStatus = isOnline ? 'Active now' : formatLastSeen(lastSeen)
  
  // Debug logging
  useEffect(() => {
    console.log('ChatThread lastSeen:', lastSeen, 'isOnline:', isOnline, 'activeStatus:', activeStatus)
  }, [lastSeen, isOnline, activeStatus])
  
  const isRecipient = isPending && !isRequester

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
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
          
          <div className="relative">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-semibold text-sm`}>
              {getUsernameInitials(username)}
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            )}
          </div>
          
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
          <DropdownMenuItem>View Profile</DropdownMenuItem>
          <DropdownMenuItem>Mute Conversation</DropdownMenuItem>
          <DropdownMenuItem destructive>Block User</DropdownMenuItem>
        </DropdownMenu>
      </div>

      {/* Pending Notice or Accept/Decline */}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} {...message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-bold text-2xl mb-4`}>
              {getUsernameInitials(username)}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Start a conversation with {username}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Send a message to begin chatting
            </p>
          </div>
        )}
      </div>

      {/* Message Input - Conditional based on conversation status */}
      {!isRecipient && !(isPending && isRequester && messages.length > 0) && (
        <MessageInput onSendMessage={onSendMessage} />
      )}
      
      {/* If sender has already sent initial message in pending request */}
      {isPending && isRequester && messages.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Waiting for {username} to accept your message request
          </p>
        </div>
      )}
      
      {/* If recipient of pending request, show accept message */}
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
