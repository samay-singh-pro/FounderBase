import api from '@/lib/api'

export interface Draft {
  id: string
  title: string
  description: string
  type: 'problem' | 'idea' | 'improvement'
  category: string
  link?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface DraftCreate {
  title: string
  description: string
  type: 'problem' | 'idea' | 'improvement'
  category: string
  link?: string
}

export interface DraftUpdate {
  title?: string
  description?: string
  type?: 'problem' | 'idea' | 'improvement'
  category?: string
  link?: string
}

interface DraftListResponse {
  drafts: Draft[]
  total: number
}

export const draftsService = {
  getAll: async (): Promise<Draft[]> => {
    const response = await api.get<DraftListResponse>('/api/v1/drafts')
    return response.data.drafts
  },

  getById: async (id: string): Promise<Draft> => {
    const response = await api.get<Draft>(`/api/v1/drafts/${id}`)
    return response.data
  },

  create: async (data: DraftCreate): Promise<Draft> => {
    const response = await api.post<Draft>('/api/v1/drafts', data)
    return response.data
  },

  update: async (id: string, data: DraftUpdate): Promise<Draft> => {
    const response = await api.put<Draft>(`/api/v1/drafts/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/drafts/${id}`)
  }
}
