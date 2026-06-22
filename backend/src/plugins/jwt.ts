// src/plugins/jwt.ts
// Plugin JWT com decorators `authenticate` e `requireRole` para RBAC.
// Registrado como fastify-plugin para compartilhar o decorator com toda a instância.

import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { UserRole } from '@prisma/client'
import { env } from '../lib/env.js'
import type { JwtPayload } from '../types/fastify.js'

export const jwtPlugin = fp(async (app: FastifyInstance) => {
  // ── 1. Registra o plugin JWT ────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: 'HS256',
    },
    // Extrai o token do header Authorization: Bearer <token>
    // ou do cookie session (futuro) — configurável via messages
    messages: {
      badRequestErrorMessage: 'Token JWT ausente ou malformado.',
      noAuthorizationInHeaderMessage:
        'Header Authorization não encontrado. Formato esperado: Bearer <token>.',
      authorizationTokenExpiredMessage: 'Token JWT expirado. Faça login novamente.',
      authorizationTokenInvalid: 'Token JWT inválido.',
    },
  })

  // ── 2. Decorator: `authenticate` ───────────────────────────────────────────
  // Verifica e decodifica o JWT. Popula `request.currentUser`.
  // Uso: adicione `{ onRequest: [app.authenticate] }` ao handler da rota.
  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // jwtVerify decodifica o token e o atribui a request.user (via @fastify/jwt)
        await request.jwtVerify<JwtPayload>()
        // Espelha para request.currentUser (nomenclatura explícita do domínio)
        request.currentUser = request.user as JwtPayload
      } catch (err) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message:
            err instanceof Error
              ? err.message
              : 'Não autorizado. Autentique-se primeiro.',
        })
      }
    },
  )

  // ── 3. Decorator: `requireRole` ────────────────────────────────────────────
  // Factory que retorna um preHandler verificando se o usuário possui um dos
  // roles permitidos. DEVE ser usado APÓS `authenticate`.
  // Uso: { preHandler: [app.authenticate, app.requireRole(['MANAGER', 'ADMIN'])] }
  app.decorate(
    'requireRole',
    (allowedRoles: UserRole[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.currentUser

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Usuário não autenticado.',
          })
        }

        if (!allowedRoles.includes(user.role)) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: `Acesso negado. Perfis permitidos: ${allowedRoles.join(', ')}.`,
          })
        }
      },
  )
})

// ── Augmenta os tipos do Fastify com os novos decorators ──────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>

    requireRole: (
      roles: UserRole[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
