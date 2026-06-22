// src/modules/vehicles/vehicles.routes.ts

import type { FastifyInstance } from 'fastify'
import { vehiclesController } from './vehicles.controller.js'

export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
  const controller = vehiclesController(app)

  // ── POST /vehicles/trips/start ─────────────────────────────────────────────
  // Requer: autenticação (qualquer perfil autenticado pode iniciar viagem)
  app.post(
    '/trips/start',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Iniciar uma viagem',
        description:
          'Abre um novo registro de viagem para o veículo. ' +
          'Valida que o KM inicial não é inferior ao odômetro atual. ' +
          'Inclui alerta se houver manutenção preventiva pendente.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['vehicleId', 'initialKm', 'origin', 'destination'],
          properties: {
            vehicleId: { type: 'string' },
            driverEmployeeId: { type: 'string' },
            initialKm: { type: 'integer', minimum: 0 },
            origin: { type: 'string' },
            destination: { type: 'string' },
            purpose: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              trip: { type: 'object' },
              maintenanceAlert: { type: 'object' },
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          422: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.startTrip,
  )

  // ── POST /vehicles/trips/:id/end ───────────────────────────────────────────
  // Requer: MANAGER ou ADMIN (ou o próprio motorista — implementar na Etapa 4)
  app.post(
    '/trips/:id/end',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Vehicles'],
        summary: 'Encerrar uma viagem',
        description:
          'Registra o KM final, calcula rodagem, atualiza o odômetro do veículo. ' +
          'Se o novo KM atingir o limiar de manutenção, muda o status do veículo ' +
          'para MAINTENANCE e retorna um alerta detalhado.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['finalKm'],
          properties: {
            finalKm: { type: 'integer', minimum: 0 },
            arrivalDateTime: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              trip: { type: 'object' },
              distanceTraveled: { type: 'integer' },
              vehicleStatusChanged: { type: ['string', 'null'] },
              maintenanceAlert: { type: 'object' },
            },
          },
        },
      },
    },
    controller.endTrip,
  )
}
