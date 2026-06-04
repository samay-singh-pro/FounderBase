import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/utils/date'
import { BellOff, Users } from 'lucide-react'

interface ConversationItemProps {
  id: string
  username: string
  avatarUrl?: string | null
  isGroup?: boolean
  memberCount?: number | null
  lastMessage: string
  timestamp: string
  unreadCount: number
  isActive: boolean
  isOnline?: boolean
  status?: 'pending' | 'accepted' | 'declined'
  isMuted?: boolean
  onClick: () => void
}

export function ConversationItem({
  username,
  avatarUrl,
  isGroup = false,
  memberCount,
  lastMessage,
  timestamp,
  unreadCount,
  isActive,
  isOnline = false,
  status,
  isMuted = false,
  onClick,
}: ConversationItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-800 relative ${
        isActive
          ? 'bg-blue-50 dark:bg-slate-800 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <Avatar
        username={username}
        avatarUrl={avatarUrl}
        size={48}
        online={!isGroup && isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {isGroup && <Users className="flex-shrink-0 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
            <span className={`font-semibold text-sm truncate ${
              unreadCount > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {username}
            </span>
            {isGroup && typeof memberCount === 'number' && (
              <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                · {memberCount}
              </span>
            )}
            {isMuted && (
              <BellOff className="flex-shrink-0 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" title="Muted" />
            )}
            {status === 'pending' && !isGroup && (
              <span className="flex-shrink-0 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                Pending
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
            {formatDate(timestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${
            unreadCount > 0 ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
          }`}>
            {lastMessage}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
