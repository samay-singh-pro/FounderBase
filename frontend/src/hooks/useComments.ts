import { useState, useEffect } from 'react'
import { commentsService, type Comment } from '@/services/comments.service'

export interface UseCommentsProps {
  opportunityId: string
  showComments: boolean
}

export function useComments({ opportunityId, showComments }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
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
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const comment = await commentsService.createComment(opportunityId, {
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

  const deleteComment = async (commentId: string) => {
    try {
      await commentsService.deleteComment(commentId)
      setComments(comments.filter((c) => c.id !== commentId))
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  return {
    comments,
    newComment,
    setNewComment,
    isLoadingComments,
    isSubmittingComment,
    submitComment,
    deleteComment,
  }
}
