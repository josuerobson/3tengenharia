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
      onRequest: [app.authenticate, app.requirePermission('timelogs.daily', 'WRITE')],
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

  // ── GET /time-logs ──────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.daily', 'READ')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Listar lançamentos de horas',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                employeeId: { type: 'string' },
                worksiteId: { type: 'string' },
                workDate: { type: 'string' },
                clockIn: { type: 'string' },
                clockOut: { type: 'string' },
                breakStart: { type: 'string', nullable: true },
                breakEnd: { type: 'string', nullable: true },
                shiftType: { type: 'string' },
                totalMinutesWorked: { type: 'integer' },
                notes: { type: 'string', nullable: true },
                isValidated: { type: 'boolean' },
                enteredByUserId: { type: 'string', nullable: true },
                employee: {
                  type: 'object',
                  properties: {
                    fullName: { type: 'string' },
                    registration: { type: 'string' },
                    position: { type: 'string' },
                  },
                },
                worksite: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.listTimeLogs,
  )

  const timeLogResponseProperties = {
    id: { type: 'string' },
    employeeId: { type: 'string' },
    worksiteId: { type: 'string' },
    workDate: { type: 'string' },
    clockIn: { type: 'string' },
    clockOut: { type: 'string' },
    breakStart: { type: 'string', nullable: true },
    breakEnd: { type: 'string', nullable: true },
    shiftType: { type: 'string' },
    totalMinutesWorked: { type: 'integer' },
    notes: { type: 'string', nullable: true },
    isValidated: { type: 'boolean' },
    enteredByUserId: { type: 'string', nullable: true },
    employee: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        registration: { type: 'string' },
        position: { type: 'string' },
      },
    },
    worksite: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
      },
    },
  }

  // ── PATCH /time-logs/:id/validate ──────────────────────────────────────────
  app.patch(
    '/:id/validate',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.daily', 'WRITE')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Validar/aprovar um lançamento de horas',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['isValidated'],
          properties: {
            isValidated: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              timeLog: {
                type: 'object',
                properties: timeLogResponseProperties,
              },
            },
          },
        },
      },
    },
    controller.validateTimeLog,
  )

  // ── PATCH /time-logs/:id ───────────────────────────────────────────────────
  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.daily', 'WRITE')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Atualizar um lançamento de horas',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            clockIn: { type: 'string' },
            clockOut: { type: 'string' },
            breakStart: { type: 'string', nullable: true },
            breakEnd: { type: 'string', nullable: true },
            shiftType: { type: 'string', enum: ['REGULAR', 'OVERTIME', 'ON_CALL', 'ABSENCE', 'VACATION', 'HOLIDAY'] },
            notes: { type: 'string', nullable: true },
            isValidated: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              timeLog: {
                type: 'object',
                properties: timeLogResponseProperties,
              },
            },
          },
        },
      },
    },
    controller.updateTimeLog,
  )

  // ── DELETE /time-logs/:id ──────────────────────────────────────────────────
  app.delete(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.daily', 'WRITE')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Excluir um lançamento de horas',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    controller.deleteTimeLog,
  )

  // ── GET /time-logs/team-allocation ─────────────────────────────────────────
  app.get(
    '/team-allocation',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.allocation', 'READ')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Dados para alocação de equipes (obras, gestores e colaboradores)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              worksites: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    code: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
              managers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    employee: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        fullName: { type: 'string' },
                      },
                    },
                  },
                },
              },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    fullName: { type: 'string' },
                    registration: { type: 'string' },
                    position: { type: 'string' },
                    worksiteId: { type: 'string', nullable: true },
                    managerId: { type: 'string', nullable: true },
                    worksite: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    manager: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        employee: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            fullName: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.listTeamAllocationData,
  )

  // ── POST /time-logs/team-allocation ────────────────────────────────────────
  app.post(
    '/team-allocation',
    {
      onRequest: [app.authenticate, app.requirePermission('timelogs.allocation', 'WRITE')],
      schema: {
        tags: ['TimeLogs'],
        summary: 'Salvar alocação de equipe',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['worksiteId', 'managerId', 'employeeIds'],
          properties: {
            worksiteId: { type: 'string' },
            managerId: { type: 'string' },
            employeeIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    controller.updateTeamAllocation,
  )
}

