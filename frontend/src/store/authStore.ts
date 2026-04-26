import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  username: string
  theme?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (token: string, user: User) => {
        set({ accessToken: token, user, isAuthenticated: true })
      },
      clearAuth: () => {
        set({ accessToken: null, user: null, isAuthenticated: false })
      },
      updateUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
