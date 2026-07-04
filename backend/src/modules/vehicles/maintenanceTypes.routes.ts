// src/modules/vehicles/maintenanceTypes.routes.ts
import type { FastifyInstance } from 'fastify'
import { maintenanceTypesService } from './maintenanceTypes.service.js'
import {
  createMaintenanceTypeBodySchema,
  updateMaintenanceTypeBodySchema,
} from './maintenanceTypes.schema.js'

export async function maintenanceTypeRoutes(app: FastifyInstance): Promise<void> {
  const svc = maintenanceTypesService

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
                    id:              { type: 'string' },
                    name:            { type: 'string' },
                    description:     { type: ['string', 'null'] },
                    isActive:        { type: 'boolean' },
                    intervalKm:      { type: ['integer', 'null'] },
                    intervalDays:    { type: ['integer', 'null'] },
                    lastServiceKm:   { type: ['integer', 'null'] },
                    lastServiceDate: { type: ['string', 'null'] },
                    createdAt:       { type: 'string' },
                    updatedAt:       { type: 'string' },
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
            name:            { type: 'string' },
            description:     { type: 'string' },
            intervalKm:      { type: 'integer' },
            intervalDays:    { type: 'integer' },
            lastServiceKm:   { type: 'integer', minimum: 0, description: 'KM do veículo na última manutenção (primeiro registro)' },
            lastServiceDate: { type: 'string', format: 'date', description: 'Data da última manutenção — YYYY-MM-DD (primeiro registro)' },
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
        body: {
          type: 'object',
          properties: {
            name:            { type: 'string' },
            description:     { type: ['string', 'null'] },
            intervalKm:      { type: ['integer', 'null'] },
            intervalDays:    { type: ['integer', 'null'] },
            isActive:        { type: 'boolean' },
            lastServiceKm:   { type: ['integer', 'null'], minimum: 0 },
            lastServiceDate: { type: ['string', 'null'], format: 'date' },
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

  // ── POST /vehicles/:vehicleId/maintenance-types/:id/complete ───────────────
  // Registra que um serviço foi realizado — atualiza lastServiceKm e lastServiceDate
  app.post(
    '/:vehicleId/maintenance-types/:id/complete',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Registra conclusão de serviço de manutenção',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId', 'id'],
          properties: {
            vehicleId: { type: 'string' },
            id:        { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['serviceKm'],
          properties: {
            serviceKm:       { type: 'integer', minimum: 0 },
            serviceDate:     { type: 'string', format: 'date' },
            serviceProvider: { type: ['string', 'null'] },
            serviceWarranty: { type: ['string', 'null'] },
            serviceCost:     { type: ['number', 'null'] },
            serviceNotes:    { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId, id } = request.params as { vehicleId: string; id: string }
      const {
        serviceKm,
        serviceDate,
        serviceProvider,
        serviceWarranty,
        serviceCost,
        serviceNotes,
      } = request.body as {
        serviceKm: number
        serviceDate?: string
        serviceProvider?: string
        serviceWarranty?: string
        serviceCost?: number
        serviceNotes?: string
      }
      const result = await svc.completeService(
        id,
        vehicleId,
        serviceKm,
        serviceDate,
        serviceProvider,
        serviceWarranty,
        serviceCost,
        serviceNotes
      )
      if ('notFound' in result) return reply.status(404).send({ message: 'Tipo não encontrado.' })
      return reply.status(200).send(result.type)
    },
  )

  // ── GET /vehicles/:vehicleId/alerts ─────────────────────────────────────────
  // Calcula e retorna todos os alertas de manutenção do veículo, por tipo de serviço
  app.get(
    '/:vehicleId/alerts',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Alertas de manutenção por tipo de serviço',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['vehicleId'],
          properties: { vehicleId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { vehicleId } = request.params as { vehicleId: string }
      const result = await svc.getAlerts(vehicleId)
      if ('notFound' in result) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(200).send({ alerts: result.alerts })
    },
  )
}
