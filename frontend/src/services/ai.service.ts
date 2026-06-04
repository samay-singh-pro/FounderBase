import api from '@/lib/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CurrentDraft {
  title?: string
  description?: string
  category?: string
  type?: string
}

export interface ChatRequest {
  message: string
  conversation_history?: ChatMessage[]
  current_draft?: CurrentDraft
}

export interface ChatResponse {
  success: boolean
  message: string
  error: string
}

export interface SuggestTitlesRequest {
  description: string
  category?: string
  type?: string
}

export interface SuggestTitlesResponse {
  success: boolean
  titles: string[]
  error: string
}

export interface ImproveDescriptionRequest {
  description: string
  type?: string
  category?: string
}

export interface ImproveDescriptionResponse {
  success: boolean
  improved: string
  suggestions: string[]
  error: string
}

export interface RefineIdeaRequest {
  title?: string
  description: string
  category?: string
  type?: string
}

export interface RefineIdeaResponse {
  success: boolean
  feedback: string
  error: string
}

export interface SummarizePostResponse {
  success: boolean
  summary: string
  comments_considered: number
  error: string
}

class AIService {
  /**
   * Chat with AI assistant about post creation
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await api.post('/api/v1/ai/chat', request)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          message: '',
          error: 'Rate limit exceeded. Please wait a few minutes before trying again.'
        }
      }
      if (error.response?.status === 503) {
        return {
          success: false,
          message: '',
          error: 'AI service is not available right now. Please try again later.'
        }
      }
      return {
        success: false,
        message: '',
        error: error.response?.data?.detail || 'Failed to get AI response. Please try again.'
      }
    }
  }

  /**
   * Get title suggestions based on description
   */
  async suggestTitles(request: SuggestTitlesRequest): Promise<SuggestTitlesResponse> {
    try {
      const response = await api.post('/api/v1/ai/suggest-titles', request)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          titles: [],
          error: 'Rate limit exceeded. Please wait a few minutes.'
        }
      }
      return {
        success: false,
        titles: [],
        error: error.response?.data?.detail || 'Failed to generate titles. Please try again.'
      }
    }
  }

  /**
   * Get improved description with suggestions
   */
  async improveDescription(request: ImproveDescriptionRequest): Promise<ImproveDescriptionResponse> {
    try {
      const response = await api.post('/api/v1/ai/improve-description', request)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          improved: '',
          suggestions: [],
          error: 'Rate limit exceeded. Please wait a few minutes.'
        }
      }
      return {
        success: false,
        improved: '',
        suggestions: [],
        error: error.response?.data?.detail || 'Failed to improve description. Please try again.'
      }
    }
  }

  /**
   * Generate a concise summary of a post + its comment thread.
   * Server-side fetches the comments so the client doesn't need to pass them.
   */
  async summarizePost(opportunityId: string): Promise<SummarizePostResponse> {
    try {
      const response = await api.post(`/api/v1/ai/summarize-post/${opportunityId}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          summary: '',
          comments_considered: 0,
          error: 'Rate limit exceeded. Please wait a few minutes.',
        }
      }
      if (error.response?.status === 503) {
        return {
          success: false,
          summary: '',
          comments_considered: 0,
          error: 'AI service is not configured.',
        }
      }
      return {
        success: false,
        summary: '',
        comments_considered: 0,
        error: error.response?.data?.detail || 'Failed to summarize. Please try again.',
      }
    }
  }

  /**
   * Get comprehensive feedback to refine idea
   */
  async refineIdea(request: RefineIdeaRequest): Promise<RefineIdeaResponse> {
    try {
      const response = await api.post('/api/v1/ai/refine-idea', request)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          feedback: '',
          error: 'Rate limit exceeded. Please wait a few minutes.'
        }
      }
      return {
        success: false,
        feedback: '',
        error: error.response?.data?.detail || 'Failed to get feedback. Please try again.'
      }
    }
  }
}

export const aiService = new AIService()
