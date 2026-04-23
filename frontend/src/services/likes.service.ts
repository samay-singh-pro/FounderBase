import api from '@/lib/api'

export interface LikeResponse {
  message: string
  liked: boolean
  total_likes: number
}

export const likesService = {
  toggleLike: async (opportunityId: string, isCurrentlyLiked: boolean): Promise<LikeResponse> => {
    const response = isCurrentlyLiked
      ? await api.delete<LikeResponse>(`/api/v1/opportunities/${opportunityId}/like`)
      : await api.post<LikeResponse>(`/api/v1/opportunities/${opportunityId}/like`)
    return response.data
  },
}
