// src/modules/time-logs/time-logs.routes.ts

import type { FastifyInstance } from 'fastify'
import { timeLogsController } from './time-logs.controller.js'

export async function timeLogRoutes(app: FastifyInstance): Promise<void> {
  const controller = timeLogsController(app)

  // ── POST /time-logs/bulk ───────────────────────────────────────────────────
  // Requer: autenticação (COLLABORATOR com vínculo de obra, MANAGER ou ADMIN)
  // O isolamento por obra é validado internamente no service, não no preHandler,
  // porque a lógica depende dos dados do body + estado do banco.
  app.post(
    '/bulk',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Lançamento coletivo de horas (bulk)',
        description:
          'Registra as horas trabalhadas de múltiplos funcionários em um único request. ' +
          'Valida: (1) isolamento de obra do Coordenador, (2) ausência de lançamentos ' +
          'duplicados na mesma data. Rejeita o lote inteiro se houver qualquer conflito.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['employeeIds', 'worksiteId', 'workDate', 'clockIn', 'clockOut'],
          properties: {
            employeeIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 100,
            },
            worksiteId: { type: 'string' },
            workDate: { type: 'string', format: 'date' },
            clockIn: { type: 'string' },
            clockOut: { type: 'string' },
            breakStart: { type: 'string' },
            breakEnd: { type: 'string' },
            shiftType: {
              type: 'string',
              enum: ['REGULAR', 'OVERTIME', 'ON_CALL', 'ABSENCE', 'VACATION', 'HOLIDAY'],
              default: 'REGULAR',
            },
            notes: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Lote registrado com sucesso.',
            type: 'object',
            properties: {
              message: { type: 'string' },
              summary: {
                type: 'object',
                properties: {
                  worksiteId: { type: 'string' },
                  worksiteName: { type: 'string' },
                  workDate: { type: 'string' },
                  employeeCount: { type: 'integer' },
                  shiftType: { type: 'string' },
                  clockIn: { type: 'string' },
                  clockOut: { type: 'string' },
                  totalMinutesWorked: { type: 'integer' },
                  totalHoursWorked: { type: 'number' },
                },
              },
            },
          },
          403: {
            description: 'Coordenador não autorizado para esta obra.',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          409: {
            description: 'Funcionários com lançamentos duplicados nesta data.',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
              duplicates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    employeeId: { type: 'string' },
                    fullName: { type: 'string' },
                    registration: { type: 'string' },
                    conflictingWorksiteId: { type: 'string' },
                    conflictingWorksiteName: { type: 'string' },
                  },
                },
              },
            },
          },
          422: {
            description: 'Dados de entrada inválidos (horários inconsistentes).',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
              issues: { type: 'object' },
            },
          },
        },
      },
    },
    controller.createBulk,
  )
}
