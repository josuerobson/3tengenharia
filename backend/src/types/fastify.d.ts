// src/types/fastify.d.ts
// Augmenta os tipos globais do Fastify com o payload JWT da aplicação 3T

import '@fastify/jwt'
import { UserRole, AccessLevel } from '@prisma/client'

// Payload armazenado dentro do token JWT
export interface JwtPayload {
  /** ID do registro na tabela `users` */
  sub: string
  /** Perfil RBAC do usuário (legado — mantido para compatibilidade) */
  role: UserRole
  /** ID do registro em `employees` (null se o usuário não é um colaborador físico) */
  employeeId: string | null
  /** ID do perfil de acesso dinâmico (null se ainda não migrado) */
  accessProfileId: string | null
  /** true = bypass total de permissões (perfil master ou tipo admin) */
  isAdminType: boolean
  /** Mapa pageKey → nível de acesso, resolvido no login */
  permissions: Record<string, AccessLevel>
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Usuário autenticado, preenchido pelo decorator `authenticate`.
     * Disponível apenas em rotas protegidas.
     */
    currentUser: JwtPayload
  }
}
