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

// ── Usuário mock para desenvolvimento (remover ao integrar com a API real) ────

const DEV_MOCK_USER: AuthUser = {
  id: 'cuid-admin-001',
  email: 'admin@3tengenharia.com.br',
  role: 'ADMIN',
  name: 'Carlos Henrique',
  employeeId: null,
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializa com o mock em dev; em prod, recuperar de localStorage/cookie
  const [user, setUser] = useState<AuthUser | null>(DEV_MOCK_USER)
  const [token, setToken] = useState<string | null>('dev-mock-token')

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
