/**
 * Follow service for user follow relationships
 */

import apiClient from '@/lib/api'

export interface FollowUser {
  id: number
  username: string
  email: string
  followed_at: string
}

export interface FollowersResponse {
  followers: FollowUser[]
  total: number
  page: number
  limit: number
}

export interface FollowingResponse {
  following: FollowUser[]
  total: number
  page: number
  limit: number
}

export interface FollowStatusResponse {
  is_following: boolean
}

export const followsService = {
  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.post(`/api/v1/users/${userId}/follow`)
    return response.data
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.delete(`/api/v1/users/${userId}/follow`)
    return response.data
  },

  /**
   * Get followers for a user
   */
  async getFollowers(userId: string, page = 1, limit = 20): Promise<FollowersResponse> {
    const response = await apiClient.get(`/api/v1/users/${userId}/followers`, {
      params: { page, limit }
    })
    return response.data
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, page = 1, limit = 20): Promise<FollowingResponse> {
    const response = await apiClient.get(`/api/v1/users/${userId}/following`, {
      params: { page, limit }
    })
    return response.data
  },

  /**
   * Check if current user is following another user
   */
  async getFollowStatus(userId: string): Promise<FollowStatusResponse> {
    const response = await apiClient.get(`/api/v1/users/${userId}/follow-status`)
    return response.data
  }
}
