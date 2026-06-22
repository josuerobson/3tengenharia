// src/modules/vehicles/vehicles.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  startTripBodySchema,
  endTripParamsSchema,
  endTripBodySchema,
} from './vehicles.schema.js'
import {
  vehiclesService,
  VehicleNotFoundError,
  VehicleNotActiveError,
  InitialKmBelowCurrentError,
  TripNotFoundError,
  TripAlreadyEndedError,
  FinalKmBelowInitialError,
} from './vehicles.service.js'

/** Erros de domínio deste módulo — re-lançados para o error-handler global */
const DOMAIN_ERRORS = [
  VehicleNotFoundError,
  VehicleNotActiveError,
  InitialKmBelowCurrentError,
  TripNotFoundError,
  TripAlreadyEndedError,
  FinalKmBelowInitialError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function vehiclesController(_app: FastifyInstance) {
  return {
    // ── POST /vehicles/trips/start ───────────────────────────────────────────
    async startTrip(request: FastifyRequest, reply: FastifyReply) {
      const body = startTripBodySchema.parse(request.body)

      // O employeeId do JWT é usado como fallback para o motorista
      const jwtEmployeeId = request.currentUser.employeeId

      let result: Awaited<ReturnType<typeof vehiclesService.startTrip>>
      try {
        result = await vehiclesService.startTrip(body, jwtEmployeeId)
      } catch (err) {
        rethrowDomain(err)
      }

      const statusCode = result.maintenanceAlert ? 201 : 201

      return reply.status(statusCode).send({
        message: 'Viagem iniciada com sucesso.',
        trip: result.trip,
        // Alerta incluído apenas quando relevante (não polui a resposta padrão)
        ...(result.maintenanceAlert && {
          maintenanceAlert: result.maintenanceAlert,
        }),
      })
    },

    // ── POST /vehicles/trips/:id/end ─────────────────────────────────────────
    async endTrip(request: FastifyRequest, reply: FastifyReply) {
      const { id } = endTripParamsSchema.parse(request.params)
      const body = endTripBodySchema.parse(request.body)

      let result: Awaited<ReturnType<typeof vehiclesService.endTrip>>
      try {
        result = await vehiclesService.endTrip(id, body)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send({
        message: 'Viagem encerrada com sucesso.',
        trip: result.trip,
        distanceTraveled: result.distanceTraveled,
        ...(result.vehicleStatusChanged && {
          vehicleStatusChanged: result.vehicleStatusChanged,
        }),
        ...(result.maintenanceAlert && {
          maintenanceAlert: result.maintenanceAlert,
        }),
      })
    },

    // ── GET /vehicles (listAll) ──────────────────────────────────────────────
    async listAll(_request: FastifyRequest, reply: FastifyReply) {
      const vehicles = await vehiclesService.listAll()
      return reply.status(200).send({ vehicles })
    },

    // ── POST /vehicles (createVehicle) ───────────────────────────────────────
    async createVehicle(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as {
        licensePlate: string; brand: string; model: string; year: number
        currentKm: number; color?: string; fuelType?: string; notes?: string
        maintenanceKmThreshold?: number; maintenanceDayThreshold?: number
      }
      const vehicle = await vehiclesService.create(body)
      return reply.status(201).send(vehicle)
    },

    // ── GET /vehicles/:id (getById) ──────────────────────────────────────────
    async getById(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const vehicle = await vehiclesService.findById(id)
      if (!vehicle) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(200).send(vehicle)
    },

    // ── PATCH /vehicles/:id (updateVehicle) ──────────────────────────────────
    async updateVehicle(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const vehicle = await vehiclesService.update(id, body)
      if (!vehicle) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(200).send(vehicle)
    },

    // ── DELETE /vehicles/:id (deleteVehicle) ─────────────────────────────────
    async deleteVehicle(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const ok = await vehiclesService.remove(id)
      if (!ok) return reply.status(404).send({ message: 'Veículo não encontrado.' })
      return reply.status(204).send()
    },
  }
}
