// src/modules/assets/assets.routes.ts

import type { FastifyInstance } from 'fastify'
import { UserRole } from '@prisma/client'
import { assetsController } from './assets.controller.js'

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  const controller = assetsController(app)

  // ── GET /assets ────────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todos os bens patrimoniais',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                assetTag: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                brand: { type: 'string', nullable: true },
                model: { type: 'string', nullable: true },
                serialNumber: { type: 'string', nullable: true },
                acquisitionDate: { type: 'string', nullable: true },
                acquisitionValue: { type: 'number', nullable: true },
                currentStatus: { type: 'string' },
                location: { type: 'string', nullable: true },
                notes: { type: 'string', nullable: true },
                currentBorrowee: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
    controller.listAssets,
  )

  // ── POST /assets ───────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [
        app.authenticate,
        app.requireRole([UserRole.MANAGER, UserRole.ADMIN]),
      ],
      schema: {
        tags: ['Assets'],
        summary: 'Criar um novo bem patrimonial',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetTag', 'description', 'category'],
          properties: {
            assetTag: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            brand: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            serialNumber: { type: 'string', nullable: true },
            acquisitionDate: { type: 'string', nullable: true },
            acquisitionValue: { type: 'number', nullable: true },
            location: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              assetTag: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              brand: { type: 'string', nullable: true },
              model: { type: 'string', nullable: true },
              serialNumber: { type: 'string', nullable: true },
              acquisitionDate: { type: 'string', nullable: true },
              acquisitionValue: { type: 'number', nullable: true },
              currentStatus: { type: 'string' },
              location: { type: 'string', nullable: true },
              notes: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    controller.createAsset,
  )

  // ── POST /assets/loans ─────────────────────────────────────────────────────
  // Requer: MANAGER ou ADMIN (apenas gestores autorizam saídas de patrimônio)
  app.post(
    '/loans',
    {
      onRequest: [
        app.authenticate,
        app.requireRole([UserRole.MANAGER, UserRole.ADMIN]),
      ],
      schema: {
        tags: ['Assets'],
        summary: 'Registrar saída/empréstimo de bem patrimonial',
        description:
          'Cria um registro de empréstimo e altera o status do bem para LOANED. ' +
          'Rejeita a operação se o bem não estiver com status AVAILABLE.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetId', 'borrowerEmployeeId'],
          properties: {
            assetId: { type: 'string' },
            borrowerEmployeeId: { type: 'string' },
            destinationWorksiteId: { type: 'string' },
            expectedReturnAt: { type: 'string', format: 'date-time' },
            checkoutNotes: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              loan: { type: 'object' },
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.createLoan,
  )

  // ── POST /assets/loans/:id/return ──────────────────────────────────────────
  // Requer: MANAGER ou ADMIN
  app.post(
    '/loans/:id/return',
    {
      onRequest: [
        app.authenticate,
        app.requireRole([UserRole.MANAGER, UserRole.ADMIN]),
      ],
      schema: {
        tags: ['Assets'],
        summary: 'Registrar devolução de bem patrimonial emprestado',
        description: 'Encerra o registro de empréstimo e altera o status do bem de volta para AVAILABLE.',
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
            returnedAt: { type: 'string', format: 'date-time' },
            returnNotes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              loan: { type: 'object' },
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.returnLoan,
  )

  // ── POST /assets/maintenance ───────────────────────────────────────────────
  // Requer: qualquer usuário autenticado pode abrir um chamado de avaria
  app.post(
    '/maintenance',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Abrir chamado de avaria/manutenção',
        description:
          'Registra a avaria de um bem patrimonial e altera seu status imediatamente ' +
          'para MAINTENANCE. Aceita URL de foto do defeito.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetId', 'issueDescription'],
          properties: {
            assetId: { type: 'string' },
            issueDescription: { type: 'string', minLength: 10 },
            defectPhotoUrl: { type: 'string', format: 'uri' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              maintenanceLog: { type: 'object' },
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.createMaintenanceLog,
  )

  // ── GET /assets/employees ──────────────────────────────────────────────────
  app.get(
    '/employees',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todos os colaboradores ativos',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fullName: { type: 'string' },
                registration: { type: 'string' },
                position: { type: 'string' },
              },
            },
          },
        },
      },
    },
    controller.listEmployees,
  )

  // ── GET /assets/worksites ──────────────────────────────────────────────────
  app.get(
    '/worksites',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todas as obras ativas',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
    },
    controller.listWorksites,
  )
}
