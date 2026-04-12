import { useState, useEffect } from 'react'
import { followsService } from '@/services/follows.service'

export interface UseFollowProps {
  userId: string
  initialIsFollowing: boolean
  onFollowChange?: (userId: string, isFollowing: boolean) => void
}

export function useFollow({ userId, initialIsFollowing, onFollowChange }: UseFollowProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)

  // Sync with prop changes (when other cards update)
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  const follow = async () => {
    // Optimistic update
    setIsFollowing(true)
    onFollowChange?.(userId, true)
    
    try {
      await followsService.followUser(parseInt(userId))
    } catch (error) {
      console.error('Failed to follow user:', error)
      // Rollback on error
      setIsFollowing(false)
      onFollowChange?.(userId, false)
      alert('Failed to follow user. Please try again.')
    }
  }

  const unfollow = async () => {
    // Optimistic update
    setIsFollowing(false)
    onFollowChange?.(userId, false)
    
    try {
      await followsService.unfollowUser(parseInt(userId))
    } catch (error) {
      console.error('Failed to unfollow user:', error)
      // Rollback on error
      setIsFollowing(true)
      onFollowChange?.(userId, true)
      alert('Failed to unfollow user. Please try again.')
    }
  }

  return {
    isFollowing,
    follow,
    unfollow,
  }
}
