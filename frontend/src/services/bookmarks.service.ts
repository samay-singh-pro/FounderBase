import api from '@/lib/api'

export interface BookmarkResponse {
  message: string
  bookmarked: boolean
}

export interface BookmarksListResponse {
  opportunities: any[]
  total: number
  skip: number
  limit: number
}

export const bookmarksService = {
  toggleBookmark: async (opportunityId: string): Promise<BookmarkResponse> => {
    const response = await api.post<BookmarkResponse>(
      `/api/v1/opportunities/${opportunityId}/bookmark`,
      { opportunity_id: opportunityId }
    )
    return response.data
  },

  removeBookmark: async (opportunityId: string): Promise<BookmarkResponse> => {
    const response = await api.delete<BookmarkResponse>(
      `/api/v1/opportunities/${opportunityId}/bookmark`
    )
    return response.data
  },

  getMyBookmarks: async (skip: number = 0, limit: number = 50): Promise<BookmarksListResponse> => {
    const response = await api.get<BookmarksListResponse>(
      `/api/v1/bookmarks?skip=${skip}&limit=${limit}`
    )
    return response.data
  },
}
