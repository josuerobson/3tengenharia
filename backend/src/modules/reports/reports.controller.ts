// src/modules/reports/reports.controller.ts
// Controllers do módulo Relatórios — thin wrappers entre Fastify e o service.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  vehicleUtilizationQuerySchema,
  assetLoansQuerySchema,
  workedHoursQuerySchema,
  vehicleMaintenanceQuerySchema,
  vehicleMileageHistoryQuerySchema,
  assetUsageHistoryQuerySchema,
  assetInventoryQuerySchema,
  assetMaintenanceQuerySchema,
  timelogsMonthlySummaryQuerySchema,
  fiveSEvolutionQuerySchema,
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

    // ── GET /reports/vehicles/maintenance ──────────────────────────────────────
    async vehicleMaintenance(request: FastifyRequest, reply: FastifyReply) {
      const query = vehicleMaintenanceQuerySchema.parse(request.query)
      const rows = await reportsService.vehicleMaintenance(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/vehicles/mileage-history ──────────────────────────────────
    async vehicleMileageHistory(request: FastifyRequest, reply: FastifyReply) {
      const query = vehicleMileageHistoryQuerySchema.parse(request.query)
      const result = await reportsService.vehicleMileageHistory(query)
      return reply.status(200).send(result)
    },

    // ── GET /reports/assets/loans ──────────────────────────────────────────────
    async assetLoans(request: FastifyRequest, reply: FastifyReply) {
      const query = assetLoansQuerySchema.parse(request.query)
      const rows = await reportsService.assetLoans(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/assets/usage-history ──────────────────────────────────────
    async assetUsageHistory(request: FastifyRequest, reply: FastifyReply) {
      const query = assetUsageHistoryQuerySchema.parse(request.query)
      const rows = await reportsService.assetUsageHistory(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/assets/inventory ───────────────────────────────────────────
    async assetInventory(request: FastifyRequest, reply: FastifyReply) {
      const query = assetInventoryQuerySchema.parse(request.query)
      const rows = await reportsService.assetInventory(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/assets/maintenance ─────────────────────────────────────────
    async assetMaintenance(request: FastifyRequest, reply: FastifyReply) {
      const query = assetMaintenanceQuerySchema.parse(request.query)
      const rows = await reportsService.assetMaintenance(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/timelogs/worked-hours ─────────────────────────────────────
    async workedHours(request: FastifyRequest, reply: FastifyReply) {
      const query = workedHoursQuerySchema.parse(request.query)
      const result = await reportsService.workedHours(query)
      return reply.status(200).send(result)
    },

    // ── GET /reports/timelogs/monthly-summary ──────────────────────────────────
    async timelogsMonthlySummary(request: FastifyRequest, reply: FastifyReply) {
      const query = timelogsMonthlySummaryQuerySchema.parse(request.query)
      const rows = await reportsService.timelogsMonthlySummary(query)
      return reply.status(200).send({ rows })
    },

    // ── GET /reports/fiveS/evolution ────────────────────────────────────────────
    async fiveSEvolution(request: FastifyRequest, reply: FastifyReply) {
      const query = fiveSEvolutionQuerySchema.parse(request.query)
      const rows = await reportsService.fiveSEvolution(query)
      return reply.status(200).send({ rows })
    },
  }
}
