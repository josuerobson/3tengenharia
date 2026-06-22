// src/modules/vehicles/maintenanceTypes.routes.ts
import type { FastifyInstance } from 'fastify'
import { maintenanceTypesService } from './maintenanceTypes.service.js'
import {
  createMaintenanceTypeBodySchema,
  updateMaintenanceTypeBodySchema,
} from './maintenanceTypes.schema.js'

export async function maintenanceTypeRoutes(app: FastifyInstance): Promise<void> {
  const svc = maintenanceTypesService(app.prisma)

  // ── GET /vehicles/:vehicleId/maintenance-types ──────────────────────────────
  app.get(
    '/:vehicleId/maintenance-types',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Lista tipos de manutenção de um veículo',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId'],
          properties: { vehicleId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              types: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id:           { type: 'string' },
                    name:         { type: 'string' },
                    description:  { type: ['string', 'null'] },
                    isActive:     { type: 'boolean' },
                    intervalKm:   { type: ['integer', 'null'] },
                    intervalDays: { type: ['integer', 'null'] },
                    createdAt:    { type: 'string' },
                    updatedAt:    { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId } = request.params as { vehicleId: string }
      const result = await svc.listByVehicle(vehicleId)
      if ('notFound' in result) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(200).send(result)
    },
  )

  // ── POST /vehicles/:vehicleId/maintenance-types ─────────────────────────────
  app.post(
    '/:vehicleId/maintenance-types',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Cadastra novo tipo de manutenção',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId'],
          properties: { vehicleId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name:         { type: 'string' },
            description:  { type: 'string' },
            intervalKm:   { type: 'integer' },
            intervalDays: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId } = request.params as { vehicleId: string }
      const body = createMaintenanceTypeBodySchema.parse(request.body)
      const result = await svc.create(vehicleId, body)
      if ('notFound' in result) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(201).send(result.type)
    },
  )

  // ── PATCH /vehicles/:vehicleId/maintenance-types/:id ───────────────────────
  app.patch(
    '/:vehicleId/maintenance-types/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Atualiza tipo de manutenção',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId', 'id'],
          properties: {
            vehicleId: { type: 'string' },
            id:        { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId, id } = request.params as { vehicleId: string; id: string }
      const body = updateMaintenanceTypeBodySchema.parse(request.body)
      const result = await svc.update(id, vehicleId, body)
      if ('notFound' in result) return reply.status(404).send({ message: 'Tipo não encontrado.' })
      return reply.status(200).send(result.type)
    },
  )

  // ── DELETE /vehicles/:vehicleId/maintenance-types/:id ──────────────────────
  app.delete(
    '/:vehicleId/maintenance-types/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Remove tipo de manutenção',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId', 'id'],
          properties: {
            vehicleId: { type: 'string' },
            id:        { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId, id } = request.params as { vehicleId: string; id: string }
      const result = await svc.remove(id, vehicleId)
      if ('notFound' in result) return reply.status(404).send({ message: 'Tipo não encontrado.' })
      return reply.status(204).send()
    },
  )
}
