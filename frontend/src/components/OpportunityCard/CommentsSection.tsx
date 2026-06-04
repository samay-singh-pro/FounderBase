import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Image as ImageIcon, Loader2, Send, Smile, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Comment } from '@/services/comments.service'
import { formatDate } from '@/utils/date'
import { Avatar } from '@/components/ui/avatar'
import GifPicker from '@/components/media/GifPicker'
import {
  classifyFile,
  mediaService,
  resolveMediaUrl,
  type Media,
} from '@/services/media.service'

interface CommentsSectionProps {
  comments: Comment[]
  newComment: string
  setNewComment: (value: string) => void
  commentMedia: Media | null
  setCommentMedia: (m: Media | null) => void
  isLoadingComments: boolean
  isSubmittingComment: boolean
  currentUsername?: string
  currentUserAvatarUrl?: string | null
  onSubmitComment: (e: React.FormEvent) => void
  onDeleteComment: (commentId: string) => void
  onViewAll: () => void
}

export function CommentsSection({
  comments,
  newComment,
  setNewComment,
  commentMedia,
  setCommentMedia,
  isLoadingComments,
  isSubmittingComment,
  currentUsername,
  currentUserAvatarUrl,
  onSubmitComment,
  onDeleteComment,
  onViewAll,
}: CommentsSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const gifButtonRef = useRef<HTMLButtonElement>(null)

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return
    const check = classifyFile(file)
    if (check.error || check.kind === 'video') return
    setIsUploading(true)
    try {
      const m = await mediaService.upload(file)
      setCommentMedia(m)
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoadingComments) {
    return (
      <div className="w-full px-4 py-3">
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-3 space-y-3">
      {Array.isArray(comments) && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.slice(0, 2).map((comment) => {
            return (
              <div key={comment.id} className="flex gap-2">
                <Avatar username={comment.username} avatarUrl={comment.avatar_url} size={32} />

                <div className="flex-1">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                      {comment.username || 'User'}
                    </div>
                    {comment.content && (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {comment.content}
                      </p>
                    )}
                    {comment.media && (
                      <div className={comment.content ? 'mt-2' : ''}>
                        <img
                          src={resolveMediaUrl(comment.media.thumbnail_url || comment.media.url)}
                          alt=""
                          className="rounded-lg max-h-48 object-contain bg-white dark:bg-slate-900"
                        />
                      </div>
                    )}
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

      <form onSubmit={onSubmitComment} className="flex gap-2 pt-2">
        <Avatar
          username={currentUsername || ''}
          avatarUrl={currentUserAvatarUrl}
          size={32}
        />
        <div className="flex-1 flex flex-col gap-2">
          {commentMedia && (
            <div className="relative inline-block w-fit max-w-[160px]">
              <img
                src={resolveMediaUrl(commentMedia.thumbnail_url || commentMedia.url)}
                alt=""
                className="rounded-lg max-h-28 object-cover border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={() => setCommentMedia(null)}
                className="absolute -top-2 -right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmittingComment}
              className="rounded-full border-slate-300 dark:border-slate-700 focus-visible:ring-slate-400"
            />
            <label
              className={`cursor-pointer rounded-full p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                isSubmittingComment || !!commentMedia || isUploading ? 'opacity-50 pointer-events-none' : ''
              }`}
              title="Attach image"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={isSubmittingComment || !!commentMedia}
              />
            </label>
            <button
              ref={gifButtonRef}
              type="button"
              onClick={() => setShowGif((v) => !v)}
              disabled={isSubmittingComment || !!commentMedia}
              className="rounded-full p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Add a GIF"
            >
              <Smile className="h-4 w-4" />
            </button>
            <GifPicker
              open={showGif}
              triggerRef={gifButtonRef}
              onClose={() => setShowGif(false)}
              onPick={(m) => setCommentMedia(m)}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingComment || (!newComment.trim() && !commentMedia)}
              className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
