// src/types/auth.ts

export type UserRole = 'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  /** Nome completo do usuário */
  name: string
  /** ID do funcionário vinculado (null se o usuário não tem perfil de colaborador físico) */
  employeeId: string | null
  cnhExpirationDate?: string | null
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COLLABORATOR: 'Colaborador',
  MANAGER_WORKSITE: 'Gestor de Obra',
  MANAGER_HR: 'Gestor de RH',
  MANAGER_WAREHOUSE: 'Gestor de Almoxarifado',
}

export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  COLLABORATOR: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  MANAGER_WORKSITE: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  MANAGER_HR: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  MANAGER_WAREHOUSE: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
}

/** Cor do texto da role no Header (sobre fundo escuro) */
export const ROLE_HEADER_TEXT: Record<UserRole, string> = {
  ADMIN: 'text-red-300',
  COLLABORATOR: 'text-white/60',
  MANAGER_WORKSITE: 'text-orange-300',
  MANAGER_HR: 'text-orange-300',
  MANAGER_WAREHOUSE: 'text-orange-300',
}
