// src/modules/time-logs/time-logs.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  bulkTimeLogBodySchema,
  listTimeLogsQuerySchema,
  validateTimeLogBodySchema,
  updateTimeLogBodySchema,
} from './time-logs.schema.js'
import { teamAllocationBodySchema } from './team-allocation.schema.js'
import {
  timeLogsService,
  WorksiteNotFoundError,
  CoordinatorWorksiteMismatchError,
  EmployeeNotLinkedError,
  DuplicateTimeLogError,
  TimeLogNotFoundError,
  ForbiddenError,
} from './time-logs.service.js'

const DOMAIN_ERRORS = [
  WorksiteNotFoundError,
  CoordinatorWorksiteMismatchError,
  EmployeeNotLinkedError,
  DuplicateTimeLogError,
  TimeLogNotFoundError,
  ForbiddenError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function timeLogsController(_app: FastifyInstance) {
  return {
    // ── POST /time-logs/bulk ─────────────────────────────────────────────────
    async createBulk(request: FastifyRequest, reply: FastifyReply) {
      const body = bulkTimeLogBodySchema.parse(request.body)
      const currentUser = request.currentUser
      const isOwnScoped = request.accessScope?.isOwnScoped ?? false

      let result: Awaited<ReturnType<typeof timeLogsService.createBulk>>
      try {
        result = await timeLogsService.createBulk(body, currentUser, isOwnScoped)
      } catch (err) {
        // DuplicateTimeLogError enriquece o response com a lista de conflitos
        if (err instanceof DuplicateTimeLogError) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
            // Lista estruturada para o frontend renderizar quem está duplicado
            duplicates: err.duplicates,
          })
        }
        rethrowDomain(err)
      }

      return reply.status(201).send({
        message:
          `${result.employeeCount} lançamento(s) registrado(s) com sucesso ` +
          `para a obra "${result.worksiteName}" em ${result.workDate}.`,
        summary: result,
      })
    },

    // ── GET /time-logs ───────────────────────────────────────────────────────
    async listTimeLogs(request: FastifyRequest, reply: FastifyReply) {
      const query = listTimeLogsQuerySchema.parse(request.query)
      const currentUser = request.currentUser
      const isOwnScoped = request.accessScope?.isOwnScoped ?? false

      let result: Awaited<ReturnType<typeof timeLogsService.list>>
      try {
        result = await timeLogsService.list(query, currentUser, isOwnScoped)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send(result)
    },

    // ── PATCH /time-logs/:id/validate ────────────────────────────────────────
    async validateTimeLog(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = validateTimeLogBodySchema.parse(request.body)
      const currentUser = request.currentUser
      const isOwnScoped = request.accessScope?.isOwnScoped ?? false

      let result
      try {
        result = await timeLogsService.validate(id, body, currentUser, isOwnScoped)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send({
        message: body.isValidated ? 'Lançamento validado com sucesso.' : 'Validação revogada com sucesso.',
        timeLog: result,
      })
    },

    // ── PATCH /time-logs/:id ─────────────────────────────────────────────────
    async updateTimeLog(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = updateTimeLogBodySchema.parse(request.body)
      const currentUser = request.currentUser
      const isOwnScoped = request.accessScope?.isOwnScoped ?? false

      let result
      try {
        result = await timeLogsService.update(id, body, currentUser, isOwnScoped)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send({
        message: 'Lançamento atualizado com sucesso.',
        timeLog: result,
      })
    },

    // ── DELETE /time-logs/:id ─────────────────────────────────────────────────
    async deleteTimeLog(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const currentUser = request.currentUser
      const isOwnScoped = request.accessScope?.isOwnScoped ?? false

      try {
        await timeLogsService.delete(id, currentUser, isOwnScoped)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(204).send()
    },

    // ── GET /time-logs/team-allocation ────────────────────────────────────────
    async listTeamAllocationData(request: FastifyRequest, reply: FastifyReply) {
      const currentUser = request.currentUser

      let result
      try {
        result = await timeLogsService.listTeamAllocationData(currentUser)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send(result)
    },

    // ── POST /time-logs/team-allocation ───────────────────────────────────────
    async updateTeamAllocation(request: FastifyRequest, reply: FastifyReply) {
      const body = teamAllocationBodySchema.parse(request.body)
      const currentUser = request.currentUser

      let result
      try {
        result = await timeLogsService.updateTeamAllocation(body, currentUser)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send(result)
    },
  }
}

