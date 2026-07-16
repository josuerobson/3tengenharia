// src/modules/reports/reports.controller.ts
// Controllers do módulo Relatórios — thin wrappers entre Fastify e o service.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  vehicleUtilizationQuerySchema,
  assetLoansQuerySchema,
  workedHoursQuerySchema,
} from './reports.schema.js'
import { reportsService } from './reports.service.js'

export function reportsController(_app: FastifyInstance) {
  return {
    // ── GET /reports/vehicles/utilization ─────────────────────────────────────
    async vehicleUtilization(request: FastifyRequest, reply: FastifyReply) {
      const query = vehicleUtilizationQuerySchema.parse(request.query)
      const rows = await reportsService.vehicleUtilization(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/assets/loans ──────────────────────────────────────────────
    async assetLoans(request: FastifyRequest, reply: FastifyReply) {
      const query = assetLoansQuerySchema.parse(request.query)
      const rows = await reportsService.assetLoans(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/timelogs/worked-hours ─────────────────────────────────────
    async workedHours(request: FastifyRequest, reply: FastifyReply) {
      const query = workedHoursQuerySchema.parse(request.query)
      const result = await reportsService.workedHours(query)
      return reply.status(200).send(result)
    },
  }
}
