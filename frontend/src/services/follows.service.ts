import apiClient from '@/lib/api'

export const followsService = {
  async followUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.post(`/api/v1/users/${userId}/follow`)
    return response.data
  },

  async unfollowUser(userId: string): Promise<{ message: string; is_following: boolean }> {
    const response = await apiClient.delete(`/api/v1/users/${userId}/follow`)
    return response.data
  },
}
