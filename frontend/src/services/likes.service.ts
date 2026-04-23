import api from '@/lib/api'
import type { Opportunity } from './opportunities.service'

export interface LikeResponse {
  message: string
  liked: boolean
  total_likes: number
}

export interface LikedOpportunitiesResponse {
  opportunities: Opportunity[]
  total: number
}

export const likesService = {
  toggleLike: async (opportunityId: string, isCurrentlyLiked: boolean): Promise<LikeResponse> => {
    const response = isCurrentlyLiked
      ? await api.delete<LikeResponse>(`/api/v1/likes/opportunities/${opportunityId}/like`)
      : await api.post<LikeResponse>(`/api/v1/likes/opportunities/${opportunityId}/like`)
    return response.data
  },

  getMyLikedOpportunities: async (skip: number = 0, limit: number = 50): Promise<LikedOpportunitiesResponse> => {
    const response = await api.get<LikedOpportunitiesResponse>(`/api/v1/likes/me/liked-opportunities`, {
      params: { skip, limit }
    })
    return response.data
  },
}
