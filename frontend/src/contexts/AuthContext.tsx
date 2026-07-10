// src/contexts/AuthContext.tsx
// Contexto de autenticação — armazena o usuário atual, o token JWT e as
// permissões resolvidas do perfil de acesso (decodificadas do próprio JWT).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { AuthUser } from '@/types/auth'
import { decodeJwtPayload } from '@/lib/jwt'
import { canRead, canWrite, isOwnScoped, type AccessLevel } from '@/lib/accessControl'

// ── Tipos do contexto ─────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string
  role: string
  employeeId: string | null
  accessProfileId: string | null
  isAdminType: boolean
  permissions: Record<string, AccessLevel>
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isAdminType: boolean
  permissions: Record<string, AccessLevel>
  login: (user: AuthUser, token: string) => void
  logout: () => void
  /** Tem acesso de leitura (qualquer nível) à página. */
  canReadPage: (pageKey: string) => boolean
  /** Tem acesso de escrita (qualquer nível) à página. */
  canWritePage: (pageKey: string) => boolean
  /** Acesso restrito aos próprios registros nesta página. */
  isOwnScopedPage: (pageKey: string) => boolean
  /** Tem acesso de leitura a pelo menos uma das páginas informadas. */
  canReadAny: (pageKeys: string[]) => boolean
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

function decodePermissions(token: string | null): { isAdminType: boolean; permissions: Record<string, AccessLevel> } {
  if (!token) return { isAdminType: false, permissions: {} }
  const payload = decodeJwtPayload<JwtPayload>(token)
  if (!payload) return { isAdminType: false, permissions: {} }
  return { isAdminType: payload.isAdminType ?? false, permissions: payload.permissions ?? {} }
}

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

  const { isAdminType, permissions } = useMemo(() => decodePermissions(token), [token])

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

  const canReadPage = useCallback(
    (pageKey: string) => isAdminType || canRead(permissions[pageKey] ?? 'NONE'),
    [isAdminType, permissions],
  )
  const canWritePage = useCallback(
    (pageKey: string) => isAdminType || canWrite(permissions[pageKey] ?? 'NONE'),
    [isAdminType, permissions],
  )
  const isOwnScopedPage = useCallback(
    (pageKey: string) => !isAdminType && isOwnScoped(permissions[pageKey] ?? 'NONE'),
    [isAdminType, permissions],
  )
  const canReadAny = useCallback(
    (pageKeys: string[]) => isAdminType || pageKeys.some((k) => canRead(permissions[k] ?? 'NONE')),
    [isAdminType, permissions],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: user !== null,
        isAdminType,
        permissions,
        login,
        logout,
        canReadPage,
        canWritePage,
        isOwnScopedPage,
        canReadAny,
      }}
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
