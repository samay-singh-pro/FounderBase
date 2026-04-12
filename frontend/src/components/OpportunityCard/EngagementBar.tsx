import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'

interface EngagementBarProps {
  likesCount: number
  commentsCount: number
  isLiked: boolean
  isBookmarked: boolean
  isTogglingLike: boolean
  isTogglingBookmark: boolean
  showCopied: boolean
  onToggleLike: () => void
  onToggleComments: () => void
  onToggleBookmark: () => void
  onShare: () => void
}

export function EngagementBar({
  likesCount,
  commentsCount,
  isLiked,
  isBookmarked,
  isTogglingLike,
  isTogglingBookmark,
  showCopied,
  onToggleLike,
  onToggleComments,
  onToggleBookmark,
  onShare,
}: EngagementBarProps) {
  return (
    <div className="flex items-center justify-between w-full px-2 py-2">
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLike}
          disabled={isTogglingLike}
          className={`hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ${
            isLiked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Heart className={`h-5 w-5 mr-1.5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">
            {isLiked ? 'Liked' : 'Like'}
          </span>
          {likesCount > 0 && (
            <span className="ml-1.5 text-xs text-slate-500">
              {likesCount}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleComments}
          className="hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-400 transition-colors"
        >
          <MessageCircle className="h-5 w-5 mr-1.5" />
          <span className="text-sm font-medium">Comment</span>
          {commentsCount > 0 && (
            <span className="ml-1.5 text-xs text-slate-500">
              {commentsCount}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleBookmark}
          disabled={isTogglingBookmark}
          className={`hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors ${
            isBookmarked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className="hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-600 dark:text-slate-400 transition-colors relative"
          title="Share post"
        >
          <Share2 className="h-5 w-5" />
          {showCopied && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-2 py-1 rounded whitespace-nowrap">
              Link copied!
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
