import api from '@/lib/api'

export interface Comment {
  id: string
  content: string
  user_id: string
  username: string
  opportunity_id: string
  created_at: string
  updated_at?: string
  is_owner: boolean
}

export interface CommentsResponse {
  comments: Comment[]
  total: number
}

export interface CreateCommentData {
  content: string
}

export const commentsService = {
  getComments: async (opportunityId: string): Promise<Comment[]> => {
    const response = await api.get<CommentsResponse>(
      `/api/v1/opportunities/${opportunityId}/comments`
    )
    return response.data.comments
  },

  createComment: async (
    opportunityId: string,
    data: CreateCommentData
  ): Promise<Comment> => {
    const response = await api.post<Comment>(
      `/api/v1/opportunities/${opportunityId}/comments`,
      data
    )
    return response.data
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/api/v1/comments/${commentId}`)
  },
}
