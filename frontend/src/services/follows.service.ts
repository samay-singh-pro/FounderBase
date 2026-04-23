import apiClient from '@/lib/api'

export interface UserProfile {
  id: string
  username: string
  email?: string
}

export interface FollowersResponse {
  followers: UserProfile[]
  total: number
  page: number
  limit: number
}

export interface FollowingResponse {
  following: UserProfile[]
  total: number
  page: number
  limit: number
}

export interface SuggestedUsersResponse {
  users: UserProfile[]
  total: number
  page: number
  limit: number
}

export const followsService = {
  async followUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.post(`/api/v1/users/${userId}/follow`)
    return response.data
  },

  async unfollowUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.delete(`/api/v1/users/${userId}/follow`)
    return response.data
  },

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<FollowersResponse> {
    const response = await apiClient.get(`/api/v1/users/${userId}/followers?page=${page}&limit=${limit}`)
    return response.data
  },

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<FollowingResponse> {
    const response = await apiClient.get(`/api/v1/users/${userId}/following?page=${page}&limit=${limit}`)
    return response.data
  },

  async getSuggestedUsers(page: number = 1, limit: number = 20): Promise<SuggestedUsersResponse> {
    const response = await apiClient.get(`/api/v1/users/suggestions?page=${page}&limit=${limit}`)
    return response.data
  },
}
