import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreVertical, UserPlus, UserCheck, MessageCircle, Edit2, Trash2 } from 'lucide-react'
import { formatDate } from '@/utils/date'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'

interface UserHeaderProps {
  username: string
  createdAt: string
  category: string
  type: string
  status: string
  isOwner: boolean
  isFollowing: boolean
  currentUsername?: string
  isDeleting?: boolean
  onFollow: () => void
  onUnfollow: () => void
  onSendMessage: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function UserHeader({
  username,
  createdAt,
  category,
  type,
  status,
  isOwner,
  isFollowing,
  currentUsername,
  isDeleting,
  onFollow,
  onUnfollow,
  onSendMessage,
  onEdit,
  onDelete,
}: UserHeaderProps) {
  const avatarColor = getAvatarColor(username)

  return (
    <div className="flex items-start gap-3">
      {/* User Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-semibold text-sm flex-shrink-0`}>
        {getUsernameInitials(username)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            {username}
          </span>
          {isOwner && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              You
            </span>
          )}
          <span className="text-slate-400">•</span>
          <span className="text-xs text-slate-500">
            {formatDate(createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
            {category}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            {type}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            {status}
          </span>
        </div>
      </div>

      {/* Follow/Message/Unfollow - show for non-owners only */}
      {!isOwner && currentUsername && (
        <div className="flex items-center gap-2">
          {!isFollowing ? (
            <Button
              size="sm"
              onClick={onFollow}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 h-8 text-sm font-medium"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Follow
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 h-8 w-8 p-0"
                title="Following"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
              <DropdownMenu
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
                align="end"
              >
                <DropdownMenuItem onClick={onSendMessage} className="whitespace-nowrap">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUnfollow} destructive className="whitespace-nowrap">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Unfollow
                </DropdownMenuItem>
              </DropdownMenu>
            </>
          )}
        </div>
      )}

      {/* Three-dot menu - only show for owner */}
      {isOwner && onEdit && onDelete && (
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 h-8 w-8 p-0"
              disabled={isDeleting}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
          align="end"
        >
          <DropdownMenuItem onClick={onEdit} disabled={isDeleting} className="whitespace-nowrap">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit post
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} disabled={isDeleting} destructive className="whitespace-nowrap">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenu>
      )}
    </div>
  )
}
