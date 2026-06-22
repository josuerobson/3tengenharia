// src/modules/time-logs/time-logs.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { bulkTimeLogBodySchema } from './time-logs.schema.js'
import {
  timeLogsService,
  WorksiteNotFoundError,
  CoordinatorWorksiteMismatchError,
  EmployeeNotLinkedError,
  DuplicateTimeLogError,
} from './time-logs.service.js'

const DOMAIN_ERRORS = [
  WorksiteNotFoundError,
  CoordinatorWorksiteMismatchError,
  EmployeeNotLinkedError,
  DuplicateTimeLogError,
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

      let result: Awaited<ReturnType<typeof timeLogsService.createBulk>>
      try {
        result = await timeLogsService.createBulk(body, currentUser)
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
  }
}
