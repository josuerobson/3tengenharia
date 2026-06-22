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
  }
}
