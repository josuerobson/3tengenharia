// src/modules/auth/auth.routes.ts
// Registro das rotas do módulo de autenticação no Fastify.
// Encapsula as rotas em um prefixo /auth para organização de namespace.

import type { FastifyInstance } from 'fastify'
import { authController } from './auth.controller.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const controller = authController(app)

  // ── POST /auth/login ─────────────────────────────────────────────────────────
  // Rota pública — não requer autenticação
  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Autenticação de usuário',
        description:
          'Valida as credenciais e retorna um token JWT Bearer para uso nas demais rotas protegidas.',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            description: 'Login realizado com sucesso.',
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              tokenType: { type: 'string', enum: ['Bearer'] },
              expiresIn: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: {
                    type: 'string',
                    enum: ['COLLABORATOR', 'MANAGER', 'ADMIN'],
                  },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  employee: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'string' },
                      fullName: { type: 'string' },
                      registration: { type: 'string' },
                      position: { type: 'string' },
                      cpf: { type: 'string' },
                      worksiteId: { type: ['string', 'null'] },
                      worksite: {
                        type: ['object', 'null'],
                        properties: {
                          code: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Credenciais inválidas.',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    controller.login,
  )

  // ── GET /auth/me ─────────────────────────────────────────────────────────────
  // Rota protegida — requer JWT válido no header Authorization: Bearer <token>
  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Dados do usuário autenticado',
        description:
          'Retorna os dados públicos do usuário correspondente ao token JWT enviado.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Dados retornados com sucesso.',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: {
                    type: 'string',
                    enum: ['COLLABORATOR', 'MANAGER', 'ADMIN'],
                  },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  employee: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'string' },
                      fullName: { type: 'string' },
                      registration: { type: 'string' },
                      position: { type: 'string' },
                      cpf: { type: 'string' },
                      worksiteId: { type: ['string', 'null'] },
                      worksite: {
                        type: ['object', 'null'],
                        properties: {
                          code: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Token inválido ou expirado.',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    controller.me,
  )

  // ── PATCH /auth/change-password ──────────────────────────────────────────────
  app.patch(
    '/change-password',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Alterar senha do usuário logado',
        description:
          'Permite que qualquer usuário logado altere sua própria senha de acesso.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          204: {
            description: 'Senha alterada com sucesso.',
            type: 'null',
          },
          400: {
            description: 'Dados inválidos ou senha atual incorreta.',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    controller.changePassword,
  )
}
