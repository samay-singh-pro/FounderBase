import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MoreVertical } from 'lucide-react'
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
}

export function ChatThread({ 
  username, 
  messages, 
  onSendMessage,
  onBack,
  showBackButton = false,
  isOnline = false
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const avatarColor = getAvatarColor(username)

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
              {isOnline ? 'Active now' : 'Offline'}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
        {messages.length > 0 ? (
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

      {/* Message Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  )
}
