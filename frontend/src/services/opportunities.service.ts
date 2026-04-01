import api from '@/lib/api'

export interface Opportunity {
  id: string
  title: string
  description: string
  type: string
  category: string
  user_id: string
  created_at: string
  status: string
  likes_count: number
  comments_count: number
  is_liked: boolean
  is_bookmarked: boolean
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[]
  total: number
  skip: number
  limit: number
}

export const opportunitiesService = {
  getAll: async (skip = 0, limit = 20): Promise<OpportunitiesResponse> => {
    const response = await api.get<OpportunitiesResponse>(
      `/api/v1/opportunities?skip=${skip}&limit=${limit}`
    )
    return response.data
  },

  getById: async (id: string): Promise<Opportunity> => {
    const response = await api.get<Opportunity>(`/api/v1/opportunities/${id}`)
    return response.data
  },
}
