import { useState } from 'react'
import { likesService } from '@/services/likes.service'
import { bookmarksService } from '@/services/bookmarks.service'

export interface UseEngagementProps {
  opportunityId: string
  initialLikesCount: number
  initialIsLiked: boolean
  initialIsBookmarked: boolean
}

export function useEngagement({
  opportunityId,
  initialLikesCount,
  initialIsLiked,
  initialIsBookmarked,
}: UseEngagementProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false)

  const toggleLike = async () => {
    const previousLiked = isLiked
    const previousCount = likesCount
    
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
    setIsTogglingLike(true)
    
    try {
      const response = await likesService.toggleLike(opportunityId, previousLiked)
      setIsLiked(response.liked)
      setLikesCount(response.total_likes)
    } catch {
      setIsLiked(previousLiked)
      setLikesCount(previousCount)
    } finally {
      setIsTogglingLike(false)
    }
  }

  const toggleBookmark = async () => {
    const previousBookmarked = isBookmarked
    setIsBookmarked(!isBookmarked)
    setIsTogglingBookmark(true)
    
    try {
      if (previousBookmarked) {
        await bookmarksService.removeBookmark(opportunityId)
      } else {
        await bookmarksService.toggleBookmark(opportunityId)
      }
    } catch {
      setIsBookmarked(previousBookmarked)
    } finally {
      setIsTogglingBookmark(false)
    }
  }

  return {
    likesCount,
    isLiked,
    isBookmarked,
    isTogglingLike,
    isTogglingBookmark,
    toggleLike,
    toggleBookmark,
  }
}
