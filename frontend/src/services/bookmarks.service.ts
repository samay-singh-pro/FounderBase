import api from '@/lib/api'

export interface BookmarkResponse {
  message: string
  bookmarked: boolean
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
}
