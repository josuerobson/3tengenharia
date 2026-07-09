// src/modules/vehicles/vehicles.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  startTripBodySchema,
  endTripParamsSchema,
  endTripBodySchema,
} from './vehicles.schema.js'
import { createIncidentBodySchema } from './tripIncidents.schema.js'
import { createFuelRecordBodySchema } from './fuelRecords.schema.js'
import {
  vehiclesService,
  VehicleNotFoundError,
  VehicleNotActiveError,
  InitialKmBelowCurrentError,
  TripNotFoundError,
  TripAlreadyEndedError,
  FinalKmBelowInitialError,
  VehicleAlreadyInTripError,
  OnlySelfTripCreationAllowedError,
  VehiclePhotosRequiredError,
} from './vehicles.service.js'

/** Erros de domínio deste módulo — re-lançados para o error-handler global */
const DOMAIN_ERRORS = [
  VehicleNotFoundError,
  VehicleNotActiveError,
  InitialKmBelowCurrentError,
  TripNotFoundError,
  TripAlreadyEndedError,
  FinalKmBelowInitialError,
  VehicleAlreadyInTripError,
  OnlySelfTripCreationAllowedError,
  VehiclePhotosRequiredError,
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
      const userRole = request.currentUser.role

      let result: Awaited<ReturnType<typeof vehiclesService.startTrip>>
      try {
        result = await vehiclesService.startTrip(body, jwtEmployeeId, userRole)
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

    // ── GET /vehicles/trips ──────────────────────────────────────────────────
    async listTrips(request: FastifyRequest, reply: FastifyReply) {
      const q = request.query as { vehicleId?: string; limit?: string; offset?: string }
      const limitVal  = q.limit  ? parseInt(q.limit,  10) : undefined
      const offsetVal = q.offset ? parseInt(q.offset, 10) : undefined
      const result = await vehiclesService.listTrips({
        ...(q.vehicleId !== undefined && { vehicleId: q.vehicleId }),
        ...(limitVal  !== undefined  && { limit:  limitVal  }),
        ...(offsetVal !== undefined  && { offset: offsetVal }),
      })
      return reply.status(200).send(result)
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

    // ── POST /vehicles/trips/:id/incidents (createIncident) ───────────────────
    async createIncident(request: FastifyRequest, reply: FastifyReply) {
      const { id: tripId } = request.params as { id: string }
      try {
        const body = createIncidentBodySchema.parse(request.body)
        const incident = await vehiclesService.createIncident(tripId, body)
        return reply.status(201).send({
          message: 'Sinistro registrado com sucesso.',
          incident,
        })
      } catch (err) {
        return rethrowDomain(err)
      }
    },

    // ── POST /vehicles/trips/:id/fuel-records (createFuelRecord) ──────────────
    async createFuelRecord(request: FastifyRequest, reply: FastifyReply) {
      const { id: tripId } = request.params as { id: string }
      try {
        const body = createFuelRecordBodySchema.parse(request.body)
        const fuelRecord = await vehiclesService.createFuelRecord(tripId, body)
        return reply.status(201).send({
          message: 'Abastecimento registrado com sucesso.',
          fuelRecord,
        })
      } catch (err) {
        return rethrowDomain(err)
      }
    },
  }
}
