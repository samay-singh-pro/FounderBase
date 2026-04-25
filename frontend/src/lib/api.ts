import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signup')
      if (!isAuthEndpoint) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_by_id: string
  created_at: string
  updated_at: string
  other_user_id: string
  other_user_username: string
  last_message: string | null
  last_message_time: string | null
  unread_count: number
  is_muted?: boolean
  is_blocked?: boolean
  is_blocked_by_me?: boolean
  is_blocked_by_them?: boolean
}

export interface Reaction {
  emoji: string
  count: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  reactions?: Reaction[]
}

export const messageApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/api/v1/messages/conversations')
    return response.data
  },

  checkConversation: async (userId: string): Promise<{
    exists: boolean
    conversation_id: string | null
    status: string | null
  }> => {
    const response = await api.get(`/api/v1/messages/conversations/check/${userId}`)
    return response.data
  },

  getOnlineStatus: async (): Promise<Record<string, { is_online: boolean; last_seen?: string }>> => {
    const response = await api.get('/api/v1/messages/online-status')
    return response.data
  },

  createConversation: async (recipientId: string): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/conversations', {
      recipient_id: recipientId,
    })
    return response.data
  },

  startConversation: async (recipientId: string, message?: string): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/conversations/start', {
      recipient_id: recipientId,
      message: message || undefined,
    })
    return response.data
  },

  acceptRequest: async (conversationId: string): Promise<Conversation> => {
    const response = await api.post(`/api/v1/messages/requests/${conversationId}/accept`)
    return response.data
  },

  declineRequest: async (conversationId: string): Promise<Conversation> => {
    const response = await api.post(`/api/v1/messages/requests/${conversationId}/decline`)
    return response.data
  },

  getMessages: async (
    conversationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Message[]> => {
    const response = await api.get(`/api/v1/messages/${conversationId}`, {
      params: { limit, offset },
    })
    return response.data
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await api.delete(`/api/v1/messages/conversations/${conversationId}`)
  },

  togglePinMessage: async (messageId: string): Promise<{ message_id: string; is_pinned: boolean; message: string }> => {
    const response = await api.patch(`/api/v1/messages/${messageId}/pin`)
    return response.data
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/api/v1/messages/${messageId}`)
  },

  addReaction: async (messageId: string, emoji: string): Promise<{ message: string; added: boolean }> => {
    const response = await api.post(`/api/v1/messages/${messageId}/reactions`, { emoji })
    return response.data
  },

  getReactions: async (messageId: string): Promise<Reaction[]> => {
    const response = await api.get(`/api/v1/messages/${messageId}/reactions`)
    return response.data
  },

  blockUser: async (userId: string): Promise<{ blocked: boolean; blocked_user_id: string; message: string }> => {
    const response = await api.post(`/api/v1/messages/users/${userId}/block`)
    return response.data
  },

  unblockUser: async (userId: string): Promise<{ blocked: boolean; blocked_user_id: string; message: string }> => {
    const response = await api.delete(`/api/v1/messages/users/${userId}/block`)
    return response.data
  },

  muteConversation: async (conversationId: string): Promise<{ muted: boolean; conversation_id: string; message: string }> => {
    const response = await api.post(`/api/v1/messages/conversations/${conversationId}/mute`)
    return response.data
  },

  unmuteConversation: async (conversationId: string): Promise<{ muted: boolean; conversation_id: string; message: string }> => {
    const response = await api.delete(`/api/v1/messages/conversations/${conversationId}/mute`)
    return response.data
  },
}

export default api
