// src/plugins/permissions.ts
// Decorator `requirePermission` — sucessor dinâmico do `requireRole`.
// Lê o mapa de permissões já embutido no JWT (assinado no login) e decide se
// a requisição pode prosseguir, anexando o nível resolvido em
// `request.accessScope` para os services aplicarem filtro de dono quando for
// nível *_OWN.

import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AccessLevel } from '@prisma/client'
import { canRead, canWrite, isOwnScoped, isValidPageKey } from '../lib/accessControl.js'

export type PermissionCapability = 'READ' | 'WRITE'

export interface AccessScope {
  level: AccessLevel
  isOwnScoped: boolean
}

export const permissionsPlugin = fp(async (app: FastifyInstance) => {
  app.decorate(
    'requirePermission',
    (pageKey: string, capability: PermissionCapability) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.currentUser

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Usuário não autenticado.',
          })
        }

        if (!isValidPageKey(pageKey)) {
          // Erro de programação (pageKey inválida) — não deveria acontecer em produção
          return reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: `pageKey de permissão inválida: ${pageKey}`,
          })
        }

        // Bypass total para perfis administradores (master ou tipo admin)
        if (user.isAdminType) {
          request.accessScope = { level: 'WRITE_ALL', isOwnScoped: false }
          return
        }

        const level = (user.permissions?.[pageKey] ?? 'NONE') as AccessLevel

        const allowed = capability === 'READ' ? canRead(level) : canWrite(level)
        if (!allowed) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Seu perfil de acesso não tem permissão para esta ação.',
          })
        }

        request.accessScope = { level, isOwnScoped: isOwnScoped(level) }
      },
  )
})

declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (
      pageKey: string,
      capability: PermissionCapability,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    /** Preenchido pelo decorator `requirePermission`. */
    accessScope?: AccessScope
  }
}
