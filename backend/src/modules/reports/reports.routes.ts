// src/modules/reports/reports.routes.ts
// Rotas do módulo Relatórios — registradas sob o prefixo /api/v1/reports (via app.ts).
// Fase 1: 1 relatório por módulo, prova de conceito da infraestrutura (hub +
// permissões + exportação). Auditoria 5S por Área reaproveita GET /5s/reports
// (ver fiveS.routes.ts) em vez de duplicar aqui.

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
}
