// src/contexts/AuthContext.tsx
// Contexto de autenticação — armazena o usuário atual e o token JWT.
// Em produção, o token vem da resposta de POST /api/v1/auth/login.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { AuthUser } from '@/types/auth'

// ── Tipos do contexto ─────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)


// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializa a partir do localStorage para persistência e login real
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('3t:user')
    if (stored) {
      try {
        return JSON.parse(stored) as AuthUser
      } catch {
        return null
      }
    }
    return null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('3t:token')
  })

  const login = useCallback((newUser: AuthUser, newToken: string) => {
    setUser(newUser)
    setToken(newToken)
    localStorage.setItem('3t:token', newToken)
    localStorage.setItem('3t:user', JSON.stringify(newUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('3t:token')
    localStorage.removeItem('3t:user')
    // Redirecionar para login (React Router) na Etapa 5
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: user !== null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}
