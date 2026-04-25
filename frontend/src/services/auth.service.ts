import api from '@/lib/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    email: string
    username: string
    full_name?: string
    bio?: string
    location?: string
    website?: string
    created_at?: string
  }
}

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  bio?: string
  location?: string
  website?: string
  created_at?: string
}

export interface UserProfileUpdate {
  full_name?: string
  bio?: string
  location?: string
  website?: string
}

export interface UserStats {
  posts_count: number
  followers_count: number
  following_count: number
  total_likes: number
  bookmarks_count: number
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
    return response.data
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/signup', {
      email: credentials.email,
      username: credentials.username,
      password: credentials.password,
    })
    return response.data
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  getMyStats: async (): Promise<UserStats> => {
    const response = await api.get<UserStats>('/api/v1/auth/me/stats')
    return response.data
  },

  getMyProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/api/v1/auth/me')
    return response.data
  },

  updateMyProfile: async (updates: UserProfileUpdate): Promise<UserProfile> => {
    const response = await api.put<UserProfile>('/api/v1/auth/me', updates)
    return response.data
  },
}
