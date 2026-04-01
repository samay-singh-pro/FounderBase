import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import { likesService } from '@/services/likes.service'
import { commentsService, type Comment } from '@/services/comments.service'
import { bookmarksService } from '@/services/bookmarks.service'
import { useAuthStore } from '@/store/authStore'
import { Heart, MessageCircle, Send, Bookmark, ExternalLink, Edit2, Trash2, Share2, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuItem } from './ui/dropdown-menu'
import { ConfirmDialog } from './ui/confirm-dialog'

interface OpportunityCardProps {
  opportunity: Opportunity
  onDelete?: (id: string) => void
}

export default function OpportunityCard({ opportunity, onDelete }: OpportunityCardProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  // Initialize state from opportunity data (from API response)
  const [likesCount, setLikesCount] = useState(opportunity.likes_count)
  const [isLiked, setIsLiked] = useState(opportunity.is_liked)
  const [isBookmarked, setIsBookmarked] = useState(opportunity.is_bookmarked)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Load comments only when expanded
  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments, opportunity.id])

  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const fetchedComments = await commentsService.getComments(opportunity.id)
      
      // Ensure we always set an array
      const commentsArray = Array.isArray(fetchedComments) ? fetchedComments : []
      setComments(commentsArray)
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleToggleLike = async () => {
    setIsTogglingLike(true)
    try {
      const response = await likesService.toggleLike(opportunity.id, isLiked)
      // Update local state based on response
      setIsLiked(response.liked)
      setLikesCount(response.total_likes)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setIsTogglingLike(false)
    }
  }

  const handleToggleBookmark = async () => {
    setIsTogglingBookmark(true)
    try {
      if (isBookmarked) {
        await bookmarksService.removeBookmark(opportunity.id)
        setIsBookmarked(false)
      } else {
        const response = await bookmarksService.toggleBookmark(opportunity.id)
        setIsBookmarked(response.bookmarked)
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    } finally {
      setIsTogglingBookmark(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await opportunitiesService.delete(opportunity.id)
      if (onDelete) {
        onDelete(opportunity.id)
      }
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
      alert('Failed to delete the post. Please try again.')
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
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      } catch (err) {
        console.error('Fallback copy failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const comment = await commentsService.createComment(opportunity.id, {
        content: newComment,
      })
      setComments([...comments, comment])
      setNewComment('')
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsService.deleteComment(commentId)
      setComments(comments.filter((c) => c.id !== commentId))
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const formatDate = (dateString: string) => {
    // Parse the date string and ensure it's interpreted correctly
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid date'
    }
    
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    // If difference is negative, the date is in the future (shouldn't happen)
    if (diffInSeconds < 0) {
      return 'Just now'
    }
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getUsernameInitials = (username?: string) => {
    if (!username) return 'U'
    return username.charAt(0).toUpperCase()
  }

  const getAvatarColor = (username?: string) => {
    if (!username) return { light: 'from-slate-100 to-slate-200', dark: 'dark:from-slate-700 dark:to-slate-600', text: 'text-slate-700 dark:text-slate-200' }
    
    // Simple hash function to generate consistent color from username
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Subtle, light color palette
    const colors = [
      { light: 'from-blue-50 to-blue-100', dark: 'dark:from-blue-900/30 dark:to-blue-800/30', text: 'text-blue-700 dark:text-blue-300' },
      { light: 'from-purple-50 to-purple-100', dark: 'dark:from-purple-900/30 dark:to-purple-800/30', text: 'text-purple-700 dark:text-purple-300' },
      { light: 'from-pink-50 to-pink-100', dark: 'dark:from-pink-900/30 dark:to-pink-800/30', text: 'text-pink-700 dark:text-pink-300' },
      { light: 'from-rose-50 to-rose-100', dark: 'dark:from-rose-900/30 dark:to-rose-800/30', text: 'text-rose-700 dark:text-rose-300' },
      { light: 'from-amber-50 to-amber-100', dark: 'dark:from-amber-900/30 dark:to-amber-800/30', text: 'text-amber-700 dark:text-amber-300' },
      { light: 'from-emerald-50 to-emerald-100', dark: 'dark:from-emerald-900/30 dark:to-emerald-800/30', text: 'text-emerald-700 dark:text-emerald-300' },
      { light: 'from-teal-50 to-teal-100', dark: 'dark:from-teal-900/30 dark:to-teal-800/30', text: 'text-teal-700 dark:text-teal-300' },
      { light: 'from-cyan-50 to-cyan-100', dark: 'dark:from-cyan-900/30 dark:to-cyan-800/30', text: 'text-cyan-700 dark:text-cyan-300' },
      { light: 'from-indigo-50 to-indigo-100', dark: 'dark:from-indigo-900/30 dark:to-indigo-800/30', text: 'text-indigo-700 dark:text-indigo-300' },
      { light: 'from-violet-50 to-violet-100', dark: 'dark:from-violet-900/30 dark:to-violet-800/30', text: 'text-violet-700 dark:text-violet-300' },
    ]
    
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  return (
    <>
    <Card className="w-full hover:shadow-lg transition-shadow duration-200 border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(opportunity.username).light} ${getAvatarColor(opportunity.username).dark} flex items-center justify-center ${getAvatarColor(opportunity.username).text} font-semibold text-sm flex-shrink-0`}>
            {getUsernameInitials(opportunity.username)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {opportunity.username}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                {formatDate(opportunity.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                {opportunity.category}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                {opportunity.type}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                {opportunity.status}
              </span>
            </div>
          </div>

          {/* Three-dot menu - only show for owner */}
          {user && user.username === opportunity.username && (
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
              <DropdownMenuItem
                onClick={() => navigate(`/edit/${opportunity.id}`)}
                disabled={isDeleting}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit post
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteClick}
                disabled={isDeleting}
                destructive
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
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
                View more
              </button>
            </>
          ) : (
            opportunity.description
          )}
        </div>
        
        {/* Display Links if available */}
        {opportunity.link && (
          <div className="mt-3 space-y-2">
            {opportunity.link.split(',').map((link, index) => {
              const trimmedLink = link.trim()
              if (!trimmedLink) return null
              
              return (
                <a
                  key={index}
                  href={trimmedLink}
                  target="_blank"
                  rel="noopener noreferrer"
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
        {/* Action Buttons */}
        <div className="flex items-center justify-between w-full px-2 py-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLike}
              disabled={isTogglingLike}
              className={`hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ${
                isLiked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Heart
                className={`h-5 w-5 mr-1.5 ${isLiked ? 'fill-current' : ''}`}
              />
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
              onClick={() => setShowComments(!showComments)}
              className="hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <MessageCircle className="h-5 w-5 mr-1.5" />
              <span className="text-sm font-medium">Comment</span>
              {opportunity.comments_count > 0 && (
                <span className="ml-1.5 text-xs text-slate-500">
                  {opportunity.comments_count}
                </span>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleBookmark}
              disabled={isTogglingBookmark}
              className={`hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors ${
                isBookmarked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Bookmark
                className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`}
              />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
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

        {showComments && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-800" />
            
            <div className="w-full px-4 py-3 space-y-3">
              {isLoadingComments ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">Loading comments...</p>
                </div>
              ) : (
                <>
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
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )})}
                      
                      {comments.length > 2 && (
                        <button
                          onClick={() => navigate(`/opportunity/${opportunity.id}`)}
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
                  <form onSubmit={handleSubmitComment} className="flex gap-2 pt-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-semibold text-xs flex-shrink-0">
                      {getUsernameInitials(user?.username)}
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
                </>
              )}
            </div>
          </>
        )}
      </CardFooter>
    </Card>

    {/* Delete Confirmation Dialog */}
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
