import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { opportunitiesService, type Opportunity } from '@/services/opportunities.service'
import { likesService } from '@/services/likes.service'
import { commentsService, type Comment } from '@/services/comments.service'
import { bookmarksService } from '@/services/bookmarks.service'
import { followsService } from '@/services/follows.service'
import { useAuthStore } from '@/store/authStore'
import { Heart, Send, Bookmark, ExternalLink, Edit2, Trash2, Share2, MoreVertical, Loader2, MessageSquare, UserPlus, UserCheck } from 'lucide-react'
import { DropdownMenu, DropdownMenuItem } from './ui/dropdown-menu'
import { ConfirmDialog } from './ui/confirm-dialog'

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('')
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (id) {
      loadOpportunity()
      loadComments()
    }
  }, [id])

  const loadOpportunity = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await opportunitiesService.getById(id!)
      setOpportunity(data)
      setLikesCount(data.likes_count)
      setIsLiked(data.is_liked)
      setIsBookmarked(data.is_bookmarked)
      setIsFollowing(data.is_following)
    } catch {
      setError('Failed to load post. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const fetchedComments = await commentsService.getComments(id!)
      const commentsArray = Array.isArray(fetchedComments) ? fetchedComments : []
      setComments(commentsArray)
    } catch {
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleToggleLike = async () => {
    if (!opportunity) return
    
    const previousLiked = isLiked
    const previousCount = likesCount
    
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
    setIsTogglingLike(true)
    
    try {
      const response = await likesService.toggleLike(opportunity.id, previousLiked)
      setIsLiked(response.liked)
      setLikesCount(response.total_likes)
    } catch {
      setIsLiked(previousLiked)
      setLikesCount(previousCount)
    } finally {
      setIsTogglingLike(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!opportunity) return
    
    const previousBookmarked = isBookmarked
    setIsBookmarked(!isBookmarked)
    setIsTogglingBookmark(true)
    
    try {
      if (previousBookmarked) {
        await bookmarksService.removeBookmark(opportunity.id)
      } else {
        await bookmarksService.toggleBookmark(opportunity.id)
      }
    } catch {
      setIsBookmarked(previousBookmarked)
    } finally {
      setIsTogglingBookmark(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!opportunity) return

    setIsDeleting(true)
    try {
      await opportunitiesService.delete(opportunity.id)
      navigate('/')
    } catch {
      alert('Failed to delete post. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opportunity || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const comment = await commentsService.createComment(opportunity.id, { content: newComment })
      setComments([...comments, comment])
      setNewComment('')
    } catch {
      alert('Failed to post comment. Please try again.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteCommentClick = (commentId: string) => {
    setCommentToDelete(commentId)
    setShowDeleteCommentConfirm(true)
  }

  const handleDeleteCommentConfirm = async () => {
    if (!commentToDelete) return

    try {
      await commentsService.deleteComment(commentToDelete)
      setComments(comments.filter((c) => c.id !== commentToDelete))
      setCommentToDelete(null)
    } catch {
      alert('Failed to delete comment. Please try again.')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/opportunity/${opportunity?.id}`
    try {
      await navigator.clipboard.writeText(url)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      // Silent fail
    }
  }

  const handleFollow = async () => {
    if (!opportunity) return
    
    setIsFollowing(true)

    try {
      await followsService.followUser(opportunity.user_id)
    } catch {
      setIsFollowing(false)
      alert('Failed to follow user. Please try again.')
    }
  }

  const handleUnfollow = async () => {
    if (!opportunity) return
    
    setIsFollowing(false)

    try {
      await followsService.unfollowUser(opportunity.user_id)
    } catch {
      setIsFollowing(true)
      alert('Failed to unfollow user. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getUsernameInitials = (username?: string) => {
    if (!username) return 'U'
    const parts = username.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return username.slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (username: string) => {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error || 'Post not found'}</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="w-full border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(opportunity.username).light} ${getAvatarColor(opportunity.username).dark} flex items-center justify-center ${getAvatarColor(opportunity.username).text} font-semibold text-base flex-shrink-0`}>
                {getUsernameInitials(opportunity.username)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                    {opportunity.username}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-sm text-slate-500">
                    {formatDate(opportunity.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                    {opportunity.category}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                    {opportunity.type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    {opportunity.status}
                  </span>
                </div>
              </div>

              {user && user.username !== opportunity.username && (
                <div className="flex items-center gap-2">
                  {!isFollowing ? (
                    <Button
                      size="sm"
                      onClick={handleFollow}
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
                        <DropdownMenuItem
                          onClick={() => setShowMessageDialog(true)}
                          className="whitespace-nowrap"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send message
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleUnfollow}
                          destructive
                          className="whitespace-nowrap"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Unfollow
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              )}

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
                    className="whitespace-nowrap"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    destructive
                    className="whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 pb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {opportunity.title}
            </h1>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {opportunity.description}
            </p>
            
            {opportunity.link && (
              <div className="mt-4 space-y-2">
                {opportunity.link.split(',').map((link, index) => {
                  const trimmedLink = link.trim()
                  if (!trimmedLink) return null
                  
                  let displayUrl = trimmedLink
                  let fullUrl = trimmedLink
                  
                  if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
                    fullUrl = `https://${trimmedLink}`
                  }
                  
                  try {
                    const urlObj = new URL(fullUrl)
                    displayUrl = urlObj.hostname
                  } catch (e) {
                    displayUrl = trimmedLink
                  }
                  
                  return (
                    <a
                      key={index}
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium group"
                    >
                      <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="underline">{displayUrl}</span>
                    </a>
                  )
                })}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-0 px-0 pb-0 pt-0">
            <div className="w-full px-4 pb-3">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-2">
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
                  onClick={handleToggleBookmark}
                  disabled={isTogglingBookmark}
                  className={`hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors ${
                    isBookmarked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
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

            <div className="border-t border-slate-200 dark:border-slate-800" />
            
            <div className="w-full px-4 py-4 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Comments ({comments.length})
              </h3>

              {isLoadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 dark:text-blue-400" />
                </div>
              ) : (
                <>
                  {Array.isArray(comments) && comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => {
                        const avatarColor = getAvatarColor(comment.username)
                        return (
                          <div key={comment.id} className="flex gap-3">
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor.light} ${avatarColor.dark} flex items-center justify-center ${avatarColor.text} font-semibold text-xs flex-shrink-0`}>
                              {comment.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            
                            <div className="flex-1">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
                                  {comment.username || 'User'}
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {comment.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-4">
                                <span className="text-xs text-slate-500">
                                  {formatDate(comment.created_at)}
                                </span>
                                {comment.is_owner && (
                                  <button
                                    onClick={() => handleDeleteCommentClick(comment.id)}
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
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  )}

                  <form onSubmit={handleSubmitComment} className="flex gap-3 pt-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600 dark:to-cyan-500 flex items-center justify-center text-blue-700 dark:text-white font-semibold text-xs flex-shrink-0">
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
          </CardFooter>
        </Card>
      </div>

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

      <ConfirmDialog
        isOpen={showDeleteCommentConfirm}
        onClose={() => {
          setShowDeleteCommentConfirm(false)
          setCommentToDelete(null)
        }}
        onConfirm={handleDeleteCommentConfirm}
        title="Delete Comment?"
        description="Are you sure you want to delete this comment?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
      {showMessageDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
          onClick={() => setShowMessageDialog(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Send Connection Request
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Send a message to {opportunity?.username} to start a conversation
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="connection-message" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Introduce yourself
                </Label>
                <Textarea
                  id="connection-message"
                  placeholder="Hi! I'm interested in discussing this opportunity with you..."
                  value={connectionMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setConnectionMessage(e.target.value)
                    }
                  }}
                  rows={4}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                  disabled={isSendingRequest}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This message will be sent with your connection request
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {connectionMessage.length}/200
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMessageDialog(false)
                    setConnectionMessage('')
                  }}
                  disabled={isSendingRequest}
                  className="flex-1 rounded-full border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!connectionMessage.trim()) {
                      alert('Please write a message')
                      return
                    }
                    setIsSendingRequest(true)
                    setTimeout(() => {
                      setIsSendingRequest(false)
                      setShowMessageDialog(false)
                      setConnectionMessage('')
                      alert('Connection request sent! (Frontend only - backend not implemented yet)')
                    }, 1000)
                  }}
                  disabled={isSendingRequest || !connectionMessage.trim()}
                  className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSendingRequest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  )
}
