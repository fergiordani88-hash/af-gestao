import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'
import type { UserRole } from '../types'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  clientId?: string
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { token, user } = await authApi.login(email, password)
          set({
            token,
            user: { ...user, role: user.role as UserRole },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return true
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Erro ao fazer login.',
          })
          return false
        }
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'af-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
