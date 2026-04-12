import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import type { Comment } from '@/services/comments.service'
import { formatDate } from '@/utils/date'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'

interface CommentsSectionProps {
  comments: Comment[]
  newComment: string
  setNewComment: (value: string) => void
  isLoadingComments: boolean
  isSubmittingComment: boolean
  currentUsername?: string
  onSubmitComment: (e: React.FormEvent) => void
  onDeleteComment: (commentId: string) => void
  onViewAll: () => void
}

export function CommentsSection({
  comments,
  newComment,
  setNewComment,
  isLoadingComments,
  isSubmittingComment,
  currentUsername,
  onSubmitComment,
  onDeleteComment,
  onViewAll,
}: CommentsSectionProps) {
  if (isLoadingComments) {
    return (
      <div className="w-full px-4 py-3">
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">Loading comments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-3 space-y-3">
      {Array.isArray(comments) && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.slice(0, 2).map((comment) => {
            const avatarColor = getAvatarColor(comment.username)
            return (
              <div key={comment.id} className="flex gap-2">
                {/* Comment user avatar */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-semibold text-xs flex-shrink-0`}>
                  {comment.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                <div className="flex-1">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                      {comment.username || 'User'}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-3">
                    <span className="text-xs text-slate-500">
                      {formatDate(comment.created_at)}
                    </span>
                    {comment.is_owner && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {comments.length > 2 && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium w-full text-center py-2"
            >
              Load more comments ({comments.length - 2} more)
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">
          No comments yet. Be the first to comment!
        </p>
      )}

      {/* Comment Input */}
      <form onSubmit={onSubmitComment} className="flex gap-2 pt-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-semibold text-xs flex-shrink-0">
          {getUsernameInitials(currentUsername)}
        </div>
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmittingComment}
            className="rounded-full border-slate-300 dark:border-slate-700 focus-visible:ring-slate-400"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSubmittingComment || !newComment.trim()}
            className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
