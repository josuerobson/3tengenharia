// src/modules/auth/auth.controller.ts
// Controllers das rotas de autenticação — responsáveis por:
//   1. Validar o input com Zod
//   2. Chamar o service
//   3. Assinar o JWT
//   4. Serializar e retornar a resposta

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { loginBodySchema, changePasswordBodySchema } from './auth.schema.js'
import {
  authService,
  InvalidCredentialsError,
  InactiveUserError,
  InvalidCurrentPasswordError,
  resolveAccessPermissions,
} from './auth.service.js'
import { env } from '../../lib/env.js'

export function authController(app: FastifyInstance) {
  return {
    // ── POST /auth/login ───────────────────────────────────────────────────────
    async login(request: FastifyRequest, reply: FastifyReply) {
      // 1. Valida e tipifica o body (lança ZodError → capturado pelo error-handler global)
      const body = loginBodySchema.parse(request.body)

      // 2. Valida as credenciais (lança InvalidCredentialsError ou InactiveUserError)
      let user: Awaited<ReturnType<typeof authService.validateCredentials>>['user']

      try {
        const result = await authService.validateCredentials(body)
        user = result.user
      } catch (err) {
        if (
          err instanceof InvalidCredentialsError ||
          err instanceof InactiveUserError
        ) {
          // Re-lança para o error-handler global capturar com o statusCode correto
          throw err
        }
        throw err
      }

      // 3. Assina o JWT com o payload RBAC (role legado + perfil de acesso dinâmico)
      const { isAdminType, permissions } = resolveAccessPermissions(user.accessProfile)
      const accessToken = app.jwt.sign({
        sub: user.id,
        role: user.role,
        employeeId: user.employee?.id ?? null,
        accessProfileId: user.accessProfileId ?? null,
        isAdminType,
        permissions,
      })

      // 4. Retorna o token e os dados públicos do usuário
      return reply.status(200).send({
        accessToken,
        tokenType: 'Bearer' as const,
        expiresIn: env.JWT_EXPIRES_IN,
        user,
      })
    },

    // ── GET /auth/me ───────────────────────────────────────────────────────────
    // Requer: `authenticate` decorator no preHandler da rota
    async me(request: FastifyRequest, reply: FastifyReply) {
      const { sub: userId } = request.currentUser

      const user = await authService.findById(userId)

      if (!user) {
        // Conta removida/desativada após a emissão do token
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Sessão inválida. Faça login novamente.',
        })
      }

      return reply.status(200).send({ user })
    },

    // ── PATCH /auth/change-password ───────────────────────────────────────────
    async changePassword(request: FastifyRequest, reply: FastifyReply) {
      const { sub: userId } = request.currentUser
      const body = changePasswordBodySchema.parse(request.body)

      try {
        await authService.changePassword(userId, body)
      } catch (err) {
        if (err instanceof InvalidCurrentPasswordError) {
          throw err
        }
        throw err
      }

      return reply.status(204).send()
    },
  }
}
