// src/modules/users/users.routes.ts
import type { FastifyInstance } from 'fastify'
import { usersController } from './users.controller.js'

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const controller = usersController(app)

  // ── GET /users ─────────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'READ')],
      schema: {
        tags: ['Users'],
        summary: 'Listar todos os usuários',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
                accessProfileId: { type: ['string', 'null'] },
                accessProfile: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    isMaster: { type: 'boolean' },
                    isAdminType: { type: 'boolean' },
                  },
                },
                employee: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'string' },
                    fullName: { type: 'string' },
                    registration: { type: 'string' },
                    position: { type: 'string' },
                    phone: { type: ['string', 'null'] },
                    cpf: { type: 'string' },
                    cnhExpirationDate: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.listUsers,
  )

  // ── POST /users ────────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Criar um novo usuário',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'password', 'role', 'fullName', 'phone', 'position', 'cpf', 'registration'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['COLLABORATOR', 'ADMIN', 'MANAGER_WORKSITE', 'MANAGER_HR', 'MANAGER_WAREHOUSE'] },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            position: { type: 'string' },
            cpf: { type: 'string', minLength: 11, maxLength: 14 },
            registration: { type: 'string' },
            isActive: { type: 'boolean' },
            cnhExpirationDate: { type: ['string', 'null'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              accessProfileId: { type: ['string', 'null'] },
              accessProfile: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  isMaster: { type: 'boolean' },
                  isAdminType: { type: 'boolean' },
                },
              },
              employee: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  fullName: { type: 'string' },
                  registration: { type: 'string' },
                  position: { type: 'string' },
                  phone: { type: ['string', 'null'] },
                  cpf: { type: 'string' },
                  cnhExpirationDate: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    controller.createUser,
  )

  // ── PATCH /users/:id ────────────────────────────────────────────────────────
  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Atualizar dados de um usuário',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['COLLABORATOR', 'ADMIN', 'MANAGER_WORKSITE', 'MANAGER_HR', 'MANAGER_WAREHOUSE'] },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            position: { type: 'string' },
            cpf: { type: 'string', minLength: 11, maxLength: 14 },
            registration: { type: 'string' },
            isActive: { type: 'boolean' },
            cnhExpirationDate: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              accessProfileId: { type: ['string', 'null'] },
              accessProfile: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  isMaster: { type: 'boolean' },
                  isAdminType: { type: 'boolean' },
                },
              },
              employee: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  fullName: { type: 'string' },
                  registration: { type: 'string' },
                  position: { type: 'string' },
                  phone: { type: ['string', 'null'] },
                  cpf: { type: 'string' },
                  cnhExpirationDate: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    controller.updateUser,
  )

  // ── DELETE /users/:id ───────────────────────────────────────────────────────
  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Excluir um usuário',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    controller.deleteUser,
  )

  // ── FUNÇÕES/CARGOS (lista gerenciável) ─────────────────────────────────────
  app.get(
    '/positions',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'READ')],
      schema: {
        tags: ['Users'],
        summary: 'Listar funções/cargos cadastrados',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.listJobFunctions,
  )

  app.post(
    '/positions',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Criar função/cargo',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.createJobFunction,
  )

  app.patch(
    '/positions/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Editar função/cargo (renomear e/ou ativar-desativar)',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.editJobFunction,
  )

  app.delete(
    '/positions/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.users', 'WRITE')],
      schema: {
        tags: ['Users'],
        summary: 'Excluir função/cargo (bloqueado se houver funcionário vinculado)',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.deleteJobFunction,
  )
}
