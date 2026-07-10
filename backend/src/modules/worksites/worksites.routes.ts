// src/modules/worksites/worksites.routes.ts
import type { FastifyInstance } from 'fastify'
import { worksitesController } from './worksites.controller.js'

export async function worksiteRoutes(app: FastifyInstance): Promise<void> {
  const controller = worksitesController(app)

  // ── GET /worksites ─────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.worksites', 'READ')],
      schema: {
        tags: ['Worksites'],
        summary: 'Listar todas as obras / centros de custo',
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
                address: { type: 'string', nullable: true },
                city: { type: 'string', nullable: true },
                state: { type: 'string', nullable: true },
                isActive: { type: 'boolean' },
                startDate: { type: 'string', nullable: true },
                endDate: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    controller.listWorksites,
  )

  // ── POST /worksites ────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.worksites', 'WRITE')],
      schema: {
        tags: ['Worksites'],
        summary: 'Criar uma nova obra',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            state: { type: 'string', maxLength: 2, nullable: true },
            isActive: { type: 'boolean' },
            startDate: { type: 'string', format: 'date', nullable: true },
            endDate: { type: 'string', format: 'date', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' },
              address: { type: 'string', nullable: true },
              city: { type: 'string', nullable: true },
              state: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              startDate: { type: 'string', nullable: true },
              endDate: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    controller.createWorksite,
  )

  // ── PATCH /worksites/:id ───────────────────────────────────────────────────
  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.worksites', 'WRITE')],
      schema: {
        tags: ['Worksites'],
        summary: 'Atualizar uma obra',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            state: { type: 'string', maxLength: 2, nullable: true },
            isActive: { type: 'boolean' },
            startDate: { type: 'string', format: 'date', nullable: true },
            endDate: { type: 'string', format: 'date', nullable: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' },
              address: { type: 'string', nullable: true },
              city: { type: 'string', nullable: true },
              state: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              startDate: { type: 'string', nullable: true },
              endDate: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    controller.updateWorksite,
  )

  // ── DELETE /worksites/:id ──────────────────────────────────────────────────
  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.worksites', 'WRITE')],
      schema: {
        tags: ['Worksites'],
        summary: 'Excluir uma obra',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    controller.deleteWorksite,
  )
}
