import { useState, useEffect } from 'react'
import { followsService } from '@/services/follows.service'
import { useToastStore } from '@/store/toastStore'

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
    setIsFollowing(true)
    onFollowChange?.(userId, true)
    
    try {
      await followsService.followUser(userId)
    } catch {
      setIsFollowing(false)
      onFollowChange?.(userId, false)
      useToastStore.getState().error('Failed to follow user. Please try again.')
    }
  }

  const unfollow = async () => {
    setIsFollowing(false)
    onFollowChange?.(userId, false)
    
    try {
      await followsService.unfollowUser(userId)
    } catch {
      setIsFollowing(true)
      onFollowChange?.(userId, true)
      useToastStore.getState().error('Failed to unfollow user. Please try again.')
    }
  }

  return {
    isFollowing,
    follow,
    unfollow,
  }
}
