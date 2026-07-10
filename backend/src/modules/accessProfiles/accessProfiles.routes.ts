// src/modules/accessProfiles/accessProfiles.routes.ts

import type { FastifyInstance } from 'fastify'
import { accessProfilesController } from './accessProfiles.controller.js'

export async function accessProfileRoutes(app: FastifyInstance): Promise<void> {
  const controller = accessProfilesController(app)

  app.get(
    '/pages',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.accessControl', 'READ')],
      schema: {
        tags: ['AccessProfiles'],
        summary: 'Listar páginas disponíveis para configurar permissão',
        security: [{ bearerAuth: [] }],
      } as any,
    },
    controller.listPages,
  )

  app.get(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.accessControl', 'READ')],
      schema: {
        tags: ['AccessProfiles'],
        summary: 'Listar perfis de acesso',
        security: [{ bearerAuth: [] }],
      } as any,
    },
    controller.list,
  )

  app.post(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.accessControl', 'WRITE')],
      schema: {
        tags: ['AccessProfiles'],
        summary: 'Criar perfil de acesso',
        security: [{ bearerAuth: [] }],
      } as any,
    },
    controller.create,
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.accessControl', 'WRITE')],
      schema: {
        tags: ['AccessProfiles'],
        summary: 'Editar perfil de acesso',
        security: [{ bearerAuth: [] }],
      } as any,
    },
    controller.edit,
  )

  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('admin.accessControl', 'WRITE')],
      schema: {
        tags: ['AccessProfiles'],
        summary: 'Excluir perfil de acesso',
        security: [{ bearerAuth: [] }],
      } as any,
    },
    controller.delete,
  )
}
