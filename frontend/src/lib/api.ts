import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import type { Media } from '@/services/media.service'
import { API_BASE_URL } from './config'

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

export interface GroupMember {
  user_id: string
  username: string
  avatar_url?: string | null
  role: 'admin' | 'member'
  joined_at?: string | null
}

export interface Conversation {
  id: string
  user1_id: string | null
  user2_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_by_id: string
  created_at: string
  updated_at: string
  is_group?: boolean
  name?: string | null
  avatar_url?: string | null
  other_user_id: string
  other_user_username: string
  other_user_avatar_url?: string | null
  last_message: string | null
  last_message_time: string | null
  unread_count: number
  is_muted?: boolean
  is_blocked?: boolean
  is_blocked_by_me?: boolean
  is_blocked_by_them?: boolean
  members?: GroupMember[] | null
  member_count?: number | null
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
  media?: Media | null
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

  createGroup: async (params: {
    name: string
    member_ids: string[]
    avatar_url?: string | null
  }): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/groups', {
      name: params.name,
      member_ids: params.member_ids,
      avatar_url: params.avatar_url ?? null,
    })
    return response.data
  },

  updateGroup: async (
    conversationId: string,
    params: { name?: string; avatar_url?: string | null },
  ): Promise<Conversation> => {
    const response = await api.patch(`/api/v1/messages/groups/${conversationId}`, params)
    return response.data
  },

  addGroupMembers: async (
    conversationId: string,
    memberIds: string[],
  ): Promise<Conversation> => {
    const response = await api.post(`/api/v1/messages/groups/${conversationId}/members`, {
      member_ids: memberIds,
    })
    return response.data
  },

  removeGroupMember: async (
    conversationId: string,
    userId: string,
  ): Promise<Conversation | { left: boolean; conversation_id: string }> => {
    const response = await api.delete(
      `/api/v1/messages/groups/${conversationId}/members/${userId}`,
    )
    return response.data
  },

  deleteGroup: async (
    conversationId: string,
  ): Promise<{ deleted: boolean; conversation_id: string }> => {
    const response = await api.delete(`/api/v1/messages/groups/${conversationId}`)
    return response.data
  },

  startConversation: async (recipientId: string, message?: string, mediaId?: string | null): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/conversations/start', {
      recipient_id: recipientId,
      message: message || undefined,
      media_id: mediaId || undefined,
    })
    return response.data
  },

  sendMessage: async (conversationId: string, content: string, mediaId?: string | null): Promise<Message> => {
    const response = await api.post<Message>('/api/v1/messages', {
      conversation_id: conversationId,
      content,
      media_id: mediaId || undefined,
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
