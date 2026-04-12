import api from '@/lib/api'

export interface Opportunity {
  id: string
  title: string
  description: string
  type: string
  category: string
  link?: string | null
  user_id: string
  username: string
  created_at: string
  status: string
  likes_count: number
  comments_count: number
  is_liked: boolean
  is_bookmarked: boolean
  is_following: boolean
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[]
  total: number
  skip: number
  limit: number
}

export interface CreateOpportunityData {
  title: string
  description: string
  type: 'problem' | 'idea' | 'improvement'
  category: string
  link?: string | null
}

export interface OpportunityFilters {
  skip?: number
  limit?: number
  category?: string
  type?: string
  status?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export const opportunitiesService = {
  getAll: async (filters: OpportunityFilters = {}): Promise<OpportunitiesResponse> => {
    const params = new URLSearchParams()
    
    if (filters.skip !== undefined) params.append('skip', filters.skip.toString())
    if (filters.limit !== undefined) params.append('limit', filters.limit.toString())
    if (filters.category) params.append('category', filters.category)
    if (filters.type) params.append('type', filters.type)
    if (filters.status) params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.sort_order) params.append('sort_order', filters.sort_order)
    
    const response = await api.get<OpportunitiesResponse>(
      `/api/v1/opportunities?${params.toString()}`
    )
    return response.data
  },

  getById: async (id: string): Promise<Opportunity> => {
    const response = await api.get<Opportunity>(`/api/v1/opportunities/${id}`)
    return response.data
  },

  create: async (data: CreateOpportunityData): Promise<Opportunity> => {
    const response = await api.post<Opportunity>('/api/v1/opportunities', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateOpportunityData>): Promise<Opportunity> => {
    const response = await api.put<Opportunity>(`/api/v1/opportunities/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/opportunities/${id}`)
  },
}
