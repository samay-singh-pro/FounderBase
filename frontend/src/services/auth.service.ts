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
    id: number
    email: string
    username: string
  }
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
}
