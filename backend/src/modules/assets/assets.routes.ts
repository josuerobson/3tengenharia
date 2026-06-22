// src/modules/assets/assets.routes.ts

import type { FastifyInstance } from 'fastify'
import { UserRole } from '@prisma/client'
import { assetsController } from './assets.controller.js'

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  const controller = assetsController(app)

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
}
