// src/modules/reports/reports.routes.ts
// Rotas do módulo Relatórios — registradas sob o prefixo /api/v1/reports (via app.ts).
// Auditoria 5S por Área e Inventário de Ferramentas e Equipamentos reaproveitam
// GET /5s/reports e GET /assets respectivamente (ver fiveS.routes.ts e
// assets.routes.ts) em vez de duplicar rota aqui.

import type { FastifyInstance } from 'fastify'
import { reportsController } from './reports.controller.js'

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  const controller = reportsController(app)

  // ── GET /reports/vehicles/utilization ────────────────────────────────────────
  app.get(
    '/vehicles/utilization',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.vehicles', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Utilização de Veículos por Período',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            vehicleId: { type: 'string' },
            worksiteId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.vehicleUtilization,
  )

  // ── GET /reports/vehicles/maintenance ──────────────────────────────────────────
  app.get(
    '/vehicles/maintenance',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.vehicles', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Manutenções Preventivas e Realizadas',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            vehicleId: { type: 'string' },
          },
        },
      },
    },
    controller.vehicleMaintenance,
  )

  // ── GET /reports/vehicles/mileage-history ────────────────────────────────────
  app.get(
    '/vehicles/mileage-history',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.vehicles', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Histórico de Quilometragem por Veículo',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            vehicleId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.vehicleMileageHistory,
  )

  // ── GET /reports/assets/loans ─────────────────────────────────────────────────
  app.get(
    '/assets/loans',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.assets', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Empréstimos Ativos e Pendentes',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'LOANED'] },
          },
        },
      },
    },
    controller.assetLoans,
  )

  // ── GET /reports/assets/usage-history ────────────────────────────────────────
  app.get(
    '/assets/usage-history',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.assets', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Histórico de Uso por Ferramenta',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.assetUsageHistory,
  )

  // ── GET /reports/assets/inventory ────────────────────────────────────────────
  app.get(
    '/assets/inventory',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.assets', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Inventário de Ferramentas e Equipamentos',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            categoryId: { type: 'string' },
            status: { type: 'string', enum: ['AVAILABLE', 'LOANED', 'MAINTENANCE', 'DAMAGED', 'WRITTEN_OFF', 'RETURNING'] },
          },
        },
      },
    },
    controller.assetInventory,
  )

  // ── GET /reports/assets/maintenance ──────────────────────────────────────────
  app.get(
    '/assets/maintenance',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.assets', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Manutenções de Ferramentas',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            assetId: { type: 'string' },
            categoryId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.assetMaintenance,
  )

  // ── GET /reports/timelogs/worked-hours ────────────────────────────────────────
  app.get(
    '/timelogs/worked-hours',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.timelogs', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Horas Trabalhadas',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: { type: 'string' },
            employeeId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.workedHours,
  )

  // ── GET /reports/timelogs/monthly-summary ───────────────────────────────────
  app.get(
    '/timelogs/monthly-summary',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.timelogs', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Resumo Mensal de Rateio de Horas',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.timelogsMonthlySummary,
  )

  // ── GET /reports/fiveS/evolution ─────────────────────────────────────────────
  app.get(
    '/fiveS/evolution',
    {
      onRequest: [app.authenticate, app.requirePermission('reports.fiveS', 'READ')],
      schema: {
        tags: ['Reports'],
        summary: 'Relatório: Evolução 5S por Período',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: { type: 'string' },
            areaType: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
      },
    },
    controller.fiveSEvolution,
  )
}
