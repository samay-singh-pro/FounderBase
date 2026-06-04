import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import { aiService } from '@/services/ai.service'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { ExternalLink, Sparkles, X } from 'lucide-react'
import { ConfirmDialog } from './ui/confirm-dialog'
import { useEngagement } from '@/hooks/useEngagement'
import { useComments } from '@/hooks/useComments'
import { useFollow } from '@/hooks/useFollow'
import { UserHeader } from './OpportunityCard/UserHeader'
import { EngagementBar } from './OpportunityCard/EngagementBar'
import { CommentsSection } from './OpportunityCard/CommentsSection'
import MediaGallery from './media/MediaGallery'

interface OpportunityCardProps {
  opportunity: Opportunity
  onDelete?: (id: string) => void
  onFollowChange?: (userId: string, isFollowing: boolean) => void
}

export default function OpportunityCard({ opportunity, onDelete, onFollowChange }: OpportunityCardProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryCommentsCount, setSummaryCommentsCount] = useState(0)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)


  const isOwner = user?.username === opportunity.username

  // Custom hooks for clean state management
  const engagement = useEngagement({
    opportunityId: opportunity.id,
    initialLikesCount: opportunity.likes_count,
    initialIsLiked: opportunity.is_liked,
    initialIsBookmarked: opportunity.is_bookmarked,
  })

  const comments = useComments({
    opportunityId: opportunity.id,
    showComments,
  })

  const follow = useFollow({
    userId: opportunity.user_id,
    initialIsFollowing: opportunity.is_following,
    onFollowChange,
  })

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await opportunitiesService.delete(opportunity.id)
      onDelete?.(opportunity.id)
    } catch {
      useToastStore.getState().error('Failed to delete the post. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/opportunity/${opportunity.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      } catch {
        // Silent fail
      }
      document.body.removeChild(textArea)
    }
  }

  const handleSendMessage = async () => {
    navigate(`/messages?userId=${opportunity.user_id}&username=${opportunity.username}`)
  }

  const handleSummarize = async () => {
    // Toggle off if already visible
    if (showSummary) {
      setShowSummary(false)
      return
    }
    // Reuse cached summary on re-open
    if (summary) {
      setShowSummary(true)
      return
    }
    setIsSummarizing(true)
    setSummaryError(null)
    setShowSummary(true)
    try {
      const result = await aiService.summarizePost(opportunity.id)
      if (result.success) {
        setSummary(result.summary)
        setSummaryCommentsCount(result.comments_considered)
      } else {
        setSummaryError(result.error || 'Failed to summarize')
      }
    } catch {
      setSummaryError('Failed to summarize. Please try again.')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <>
      <Card className="w-full hover:shadow-lg transition-shadow duration-200 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <UserHeader
            username={opportunity.username}
            avatarUrl={opportunity.avatar_url}
            createdAt={opportunity.created_at}
            category={opportunity.category}
            type={opportunity.type}
            status={opportunity.status}
            isOwner={isOwner}
            isFollowing={follow.isFollowing}
            currentUsername={user?.username}
            isDeleting={isDeleting}
            onFollow={follow.follow}
            onUnfollow={follow.unfollow}
            onSendMessage={handleSendMessage}
            onEdit={() => navigate(`/edit/${opportunity.id}`)}
            onDelete={() => setShowDeleteConfirm(true)}
            onSummarize={handleSummarize}
            isSummarizing={isSummarizing}
            isSummaryOpen={showSummary}
          />
        </CardHeader>
        
        <CardContent className="pt-0 pb-3">
          <h3 
            onClick={() => navigate(`/opportunity/${opportunity.id}`)}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {opportunity.title}
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {opportunity.description.length > 150 ? (
              <>
                {opportunity.description.substring(0, 150)}...{' '}
                <button
                  onClick={() => navigate(`/opportunity/${opportunity.id}`)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Read more
                </button>
              </>
            ) : (
              <>
                {opportunity.description}
                <div className="mt-2">
                  <button
                    onClick={() => navigate(`/opportunity/${opportunity.id}`)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                  >
                    View details →
                  </button>
                </div>
              </>
            )}
          </div>
          
          {showSummary && (
            <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI summary
                </div>
                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 -mr-1 -mt-1 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  aria-label="Hide summary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {isSummarizing ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Reading the post and comments...
                </p>
              ) : summaryError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{summaryError}</p>
              ) : summary ? (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                  <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    Generated from the post and {summaryCommentsCount}{' '}
                    {summaryCommentsCount === 1 ? 'comment' : 'comments'}.
                  </p>
                </>
              ) : null}
            </div>
          )}

          {opportunity.media && opportunity.media.length > 0 && (
            <div className="mt-3">
              <MediaGallery
                media={opportunity.media}
                variant="feed"
                onItemClick={() => navigate(`/opportunity/${opportunity.id}`)}
              />
            </div>
          )}

          {/* Display Links if available */}
          {opportunity.link && (
            <div className="mt-3 space-y-2">
              {opportunity.link.split(',').map((link, index) => {
                const trimmedLink = link.trim()
                if (!trimmedLink) return null

                // Force an absolute URL so the browser doesn't resolve bare
                // hostnames like "example.com" as paths relative to the feed.
                const hasProtocol = /^https?:\/\//i.test(trimmedLink)
                const fullUrl = hasProtocol ? trimmedLink : `https://${trimmedLink}`

                return (
                  <a
                    key={index}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline group"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{trimmedLink}</span>
                  </a>
                )
              })}
            </div>
          )}
        </CardContent>
        
        <div className="border-t border-slate-200 dark:border-slate-800" />
        
        <CardFooter className="flex-col items-start gap-0 p-0">
          <EngagementBar
            likesCount={engagement.likesCount}
            commentsCount={opportunity.comments_count}
            isLiked={engagement.isLiked}
            isBookmarked={engagement.isBookmarked}
            isTogglingLike={engagement.isTogglingLike}
            isTogglingBookmark={engagement.isTogglingBookmark}
            showCopied={showCopied}
            onToggleLike={engagement.toggleLike}
            onToggleComments={() => setShowComments(!showComments)}
            onToggleBookmark={engagement.toggleBookmark}
            onShare={handleShare}
          />

          {showComments && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-800" />
              <CommentsSection
                comments={comments.comments}
                newComment={comments.newComment}
                setNewComment={comments.setNewComment}
                commentMedia={comments.commentMedia}
                setCommentMedia={comments.setCommentMedia}
                isLoadingComments={comments.isLoadingComments}
                isSubmittingComment={comments.isSubmittingComment}
                currentUsername={user?.username}
                currentUserAvatarUrl={user?.avatar_url}
                onSubmitComment={comments.submitComment}
                onDeleteComment={comments.deleteComment}
                onViewAll={() => navigate(`/opportunity/${opportunity.id}`)}
              />
            </>
          )}
        </CardFooter>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Post?"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

    </>
  )
}
