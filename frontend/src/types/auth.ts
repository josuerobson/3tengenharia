// src/types/auth.ts

export type UserRole = 'ADMIN' | 'MANAGER' | 'COLLABORATOR'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  /** Nome completo do usuário */
  name: string
  /** ID do funcionário vinculado (null se o usuário não tem perfil de colaborador físico) */
  employeeId: string | null
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  COLLABORATOR: 'Colaborador',
}

export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  MANAGER: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  COLLABORATOR: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
}

/** Cor do texto da role no Header (sobre fundo escuro) */
export const ROLE_HEADER_TEXT: Record<UserRole, string> = {
  ADMIN: 'text-red-300',
  MANAGER: 'text-orange-300',
  COLLABORATOR: 'text-white/60',
}
