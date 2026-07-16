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
    (pageKeyOrKeys: string | string[], capability: PermissionCapability) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.currentUser

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Usuário não autenticado.',
          })
        }

        const pageKeys = Array.isArray(pageKeyOrKeys) ? pageKeyOrKeys : [pageKeyOrKeys]
        for (const pageKey of pageKeys) {
          if (!isValidPageKey(pageKey)) {
            // Erro de programação (pageKey inválida) — não deveria acontecer em produção
            return reply.status(500).send({
              statusCode: 500,
              error: 'Internal Server Error',
              message: `pageKey de permissão inválida: ${pageKey}`,
            })
          }
        }

        // Bypass total para perfis administradores (master ou tipo admin)
        if (user.isAdminType) {
          request.accessScope = { level: 'WRITE_ALL', isOwnScoped: false }
          return
        }

        // Quando mais de uma pageKey é aceita (endpoint compartilhado por mais de
        // uma tela), usa a que der o melhor acesso: se qualquer uma delas conceder
        // nível *_ALL, isso vence (acesso amplo); senão, cai para *_OWN se alguma
        // conceder; só nega se nenhuma das pageKeys conceder a capacidade pedida.
        let bestLevel: AccessLevel = 'NONE'
        for (const pageKey of pageKeys) {
          const level = (user.permissions?.[pageKey] ?? 'NONE') as AccessLevel
          const allowed = capability === 'READ' ? canRead(level) : canWrite(level)
          if (!allowed) continue
          if (!isOwnScoped(level)) {
            bestLevel = level
            break
          }
          if (bestLevel === 'NONE') bestLevel = level
        }

        if (bestLevel === 'NONE') {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Seu perfil de acesso não tem permissão para esta ação.',
          })
        }

        request.accessScope = { level: bestLevel, isOwnScoped: isOwnScoped(bestLevel) }
      },
  )
})

declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (
      pageKeyOrKeys: string | string[],
      capability: PermissionCapability,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    /** Preenchido pelo decorator `requirePermission`. */
    accessScope?: AccessScope
  }
}
