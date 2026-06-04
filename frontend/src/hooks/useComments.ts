import { useState, useEffect } from 'react'
import { commentsService, type Comment } from '@/services/comments.service'
import { useToastStore } from '@/store/toastStore'
import type { Media } from '@/services/media.service'

export interface UseCommentsProps {
  opportunityId: string
  showComments: boolean
}

export function useComments({ opportunityId, showComments }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentMedia, setCommentMedia] = useState<Media | null>(null)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments, opportunityId])

  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const fetchedComments = await commentsService.getComments(opportunityId)
      const commentsArray = Array.isArray(fetchedComments) ? fetchedComments : []
      setComments(commentsArray)
    } catch {
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() && !commentMedia) return

    setIsSubmittingComment(true)
    try {
      const comment = await commentsService.createComment(opportunityId, {
        content: newComment,
        media_id: commentMedia?.id ?? null,
      })
      setComments([...comments, comment])
      setNewComment('')
      setCommentMedia(null)
    } catch {
      useToastStore.getState().error('Failed to post comment. Please try again.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      await commentsService.deleteComment(commentId)
      setComments(comments.filter((c) => c.id !== commentId))
    } catch {
      useToastStore.getState().error('Failed to delete comment. Please try again.')
    }
  }

  return {
    comments,
    newComment,
    setNewComment,
    commentMedia,
    setCommentMedia,
    isLoadingComments,
    isSubmittingComment,
    submitComment,
    deleteComment,
  }
}
