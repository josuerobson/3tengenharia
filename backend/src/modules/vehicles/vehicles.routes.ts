// src/modules/vehicles/vehicles.routes.ts

import type { FastifyInstance, FastifySchema } from 'fastify'
import { vehiclesController } from './vehicles.controller.js'

// Helper para tipar corretamente os schemas com campos do swagger (@fastify/swagger)
// sem acionar o erro TS2353 em objetos inline de app.get/post/patch/delete
function schema(s: FastifySchema & { tags?: string[]; summary?: string; security?: unknown[] }) {
  return s
}

export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
  const controller = vehiclesController(app)

  // ── GET /vehicles ────────────────────────────────────────────────────────────
  app.get(
    '/',
    { onRequest: [app.authenticate], schema: schema({ tags: ['Vehicles'], summary: 'Lista todos os veículos', security: [{ bearerAuth: [] }] }) },
    controller.listAll,
  )

  // ── POST /vehicles ───────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: schema({
        tags: ['Vehicles'], summary: 'Cadastra novo veículo', security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['licensePlate', 'brand', 'model', 'year', 'currentKm'],
          properties: {
            licensePlate:            { type: 'string' },
            brand:                   { type: 'string' },
            model:                   { type: 'string' },
            year:                    { type: 'integer' },
            color:                   { type: 'string' },
            fuelType:                { type: 'string' },
            currentKm:               { type: 'integer' },
            maintenanceKmThreshold:  { type: 'integer' },
            maintenanceDayThreshold: { type: 'integer' },
            notes:                   { type: 'string' },
          },
        },
      }),
    },
    controller.createVehicle,
  )

  // ── GET /vehicles/:id ────────────────────────────────────────────────────────
  app.get(
    '/:id',
    { onRequest: [app.authenticate], schema: schema({ tags: ['Vehicles'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } }) },
    controller.getById,
  )

  // ── PATCH /vehicles/:id ──────────────────────────────────────────────────────
  app.patch(
    '/:id',
    { onRequest: [app.authenticate], schema: schema({ tags: ['Vehicles'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } }) },
    controller.updateVehicle,
  )

  // ── DELETE /vehicles/:id ─────────────────────────────────────────────────────
  app.delete(
    '/:id',
    { onRequest: [app.authenticate], schema: schema({ tags: ['Vehicles'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } }) },
    controller.deleteVehicle,
  )

  // ── GET /vehicles/trips ──────────────────────────────────────────────────────
  app.get(
    '/trips',
    {
      onRequest: [app.authenticate],
      schema: schema({
        tags: ['Vehicles'], summary: 'Lista histórico de viagens', security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            vehicleId: { type: 'string' },
            limit:     { type: 'integer', minimum: 1, maximum: 500 },
            offset:    { type: 'integer', minimum: 0 },
          },
        },
      }),
    },
    controller.listTrips,
  )

  // ── POST /vehicles/trips/start ───────────────────────────────────────────────
  app.post(
    '/trips/start',
    {
      onRequest: [app.authenticate],
      schema: schema({
        tags: ['Vehicles'], summary: 'Iniciar uma viagem', security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['vehicleId', 'initialKm', 'origin', 'destination'],
          properties: {
            vehicleId:            { type: 'string' },
            driverEmployeeId:     { type: 'string' },
            initialKm:            { type: 'integer', minimum: 0 },
            origin:               { type: 'string' },
            destination:          { type: 'string' },
            purpose:              { type: 'string' },
            departureGeolocation: { type: 'string' },
            worksiteId:           { type: 'string' },
          },
        },
      }),
    },
    controller.startTrip,
  )

  // ── POST /vehicles/trips/:id/end ─────────────────────────────────────────────
  app.post(
    '/trips/:id/end',
    {
      onRequest: [app.authenticate],
      schema: schema({
        tags: ['Vehicles'], summary: 'Encerrar uma viagem', security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['finalKm'],
          properties: {
            finalKm:            { type: 'integer', minimum: 0 },
            arrivalDateTime:    { type: 'string', format: 'date-time' },
            notes:              { type: 'string' },
            arrivalGeolocation: { type: 'string' },
          },
        },
      }),
    },
    controller.endTrip,
  )
}
