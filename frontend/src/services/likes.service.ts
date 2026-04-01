import api from '@/lib/api'

export interface LikeResponse {
  message: string
  liked: boolean
  total_likes: number
}

export interface LikeStatusResponse {
  opportunity_id: string
  is_liked: boolean
  total_likes: number
}

export interface LikeCountResponse {
  total_likes: number
}

export const likesService = {
  toggleLike: async (opportunityId: string, isCurrentlyLiked: boolean): Promise<LikeResponse> => {
    // If already liked, send DELETE to unlike. Otherwise POST to like.
    const response = isCurrentlyLiked
      ? await api.delete<LikeResponse>(`/api/v1/opportunities/${opportunityId}/like`)
      : await api.post<LikeResponse>(`/api/v1/opportunities/${opportunityId}/like`)
    return response.data
  },

  getLikeStatus: async (opportunityId: string): Promise<LikeStatusResponse> => {
    const response = await api.get<LikeStatusResponse>(
      `/api/v1/opportunities/${opportunityId}/like/status`
    )
    return response.data
  },

  getLikeCount: async (opportunityId: string): Promise<LikeCountResponse> => {
    const response = await api.get<LikeCountResponse>(
      `/api/v1/opportunities/${opportunityId}/like/count`
    )
    return response.data
  },
}
