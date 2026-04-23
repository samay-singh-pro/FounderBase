import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-logout if this is not a login/signup request
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signup')
      
      if (!isAuthEndpoint) {
        // Token expired or invalid - automatically logout
        const { clearAuth } = useAuthStore.getState()
        clearAuth()
        // Redirect to login page
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// Message API Functions
// ============================================================================

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
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export const messageApi = {
  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/api/v1/messages/conversations')
    return response.data
  },

  // Check if conversation exists with a user
  checkConversation: async (userId: string): Promise<{
    exists: boolean
    conversation_id: string | null
    status: string | null
  }> => {
    const response = await api.get(`/api/v1/messages/conversations/check/${userId}`)
    return response.data
  },

  // Get online status for users in conversations
  getOnlineStatus: async (): Promise<Record<string, { is_online: boolean; last_seen?: string }>> => {
    const response = await api.get('/api/v1/messages/online-status')
    return response.data
  },

  // Create or get conversation with a user
  createConversation: async (recipientId: string): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/conversations', {
      recipient_id: recipientId,
    })
    return response.data
  },

  // Create conversation and optionally send the first message in one call
  startConversation: async (recipientId: string, message?: string): Promise<Conversation> => {
    const response = await api.post('/api/v1/messages/conversations/start', {
      recipient_id: recipientId,
      message: message || undefined,
    })
    return response.data
  },

  // Get a specific conversation
  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get(`/api/v1/messages/conversations/${conversationId}`)
    return response.data
  },

  // Get pending message requests
  getRequests: async (): Promise<Conversation[]> => {
    const response = await api.get('/api/v1/messages/requests')
    return response.data
  },

  // Accept a message request
  acceptRequest: async (conversationId: string): Promise<Conversation> => {
    const response = await api.post(`/api/v1/messages/requests/${conversationId}/accept`)
    return response.data
  },

  // Decline a message request
  declineRequest: async (conversationId: string): Promise<Conversation> => {
    const response = await api.post(`/api/v1/messages/requests/${conversationId}/decline`)
    return response.data
  },

  // Get messages in a conversation
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

  // Send a message
  sendMessage: async (conversationId: string, content: string): Promise<Message> => {
    const response = await api.post('/api/v1/messages', {
      conversation_id: conversationId,
      content,
    })
    return response.data
  },

  // Mark a message as read
  markMessageRead: async (messageId: string): Promise<Message> => {
    const response = await api.patch(`/api/v1/messages/${messageId}/read`)
    return response.data
  },

  // Mark all messages in conversation as read
  markConversationRead: async (conversationId: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/v1/messages/conversations/${conversationId}/mark-read`)
    return response.data
  },
}

export default api
