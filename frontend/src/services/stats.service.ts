import api from '@/lib/api'

export interface CategoryStat {
  category: string
  count: number
}

export interface TrendingCategoriesResponse {
  categories: CategoryStat[]
}

export interface ActiveUser {
  id: string
  username: string
  email: string
  posts_count: number
}

export interface ActiveUsersResponse {
  users: ActiveUser[]
}

export interface PlatformOverview {
  total_opportunities: number
  total_users: number
  total_categories: number
  by_type: {
    problem?: number
    idea?: number
    improvement?: number
  }
}

export const statsService = {
  getTrendingCategories: async (limit: number = 6): Promise<TrendingCategoriesResponse> => {
    const response = await api.get<TrendingCategoriesResponse>(`/api/v1/stats/trending-categories`, {
      params: { limit }
    })
    return response.data
  },

  getActiveUsers: async (limit: number = 5): Promise<ActiveUsersResponse> => {
    const response = await api.get<ActiveUsersResponse>(`/api/v1/stats/active-users`, {
      params: { limit }
    })
    return response.data
  },

  getPlatformOverview: async (): Promise<PlatformOverview> => {
    const response = await api.get<PlatformOverview>(`/api/v1/stats/platform-overview`)
    return response.data
  },
}
