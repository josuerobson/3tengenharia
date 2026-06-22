// src/modules/fiveS/fiveS.controller.ts
// Controllers do Módulo 5S — thin wrappers entre Fastify e o service.
// Responsabilidade: parse/validate de input, delegação ao service, formatação do response.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  createAuditBodySchema,
  validateAuditBodySchema,
  auditIdParamSchema,
  reportsQuerySchema,
} from './fiveS.schema.js'
import {
  fiveSService,
  AuditNotFoundError,
  AuditAlreadyValidatedError,
  WorksiteNotFoundError,
  EmployeeNotFoundError,
} from './fiveS.service.js'

/** Erros de domínio deste módulo — relançados para o error-handler global */
const DOMAIN_ERRORS = [
  AuditNotFoundError,
  AuditAlreadyValidatedError,
  WorksiteNotFoundError,
  EmployeeNotFoundError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function fiveSController(_app: FastifyInstance) {
  return {
    // ── POST /5s/audits ────────────────────────────────────────────────────────
    /**
     * Cria uma nova auditoria 5S com fotos.
     * Acesso: COLLABORATOR, MANAGER, ADMIN.
     *
     * O auditorEmployeeId é extraído do JWT (request.currentUser.employeeId),
     * garantindo que o colaborador que criou o registro seja sempre o usuário logado.
     */
    async createAudit(request: FastifyRequest, reply: FastifyReply) {
      const body = createAuditBodySchema.parse(request.body)

      // Identidade do usuário logado — extraída do JWT pelo decorator authenticate
      const { sub: userId, employeeId } = request.currentUser

      let result: Awaited<ReturnType<typeof fiveSService.createAudit>>
      try {
        result = await fiveSService.createAudit(body, userId, employeeId)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(201).send({
        message:    'Auditoria 5S registrada com sucesso.',
        audit:      result.audit,
        photosCount: result.audit.photos.length,
      })
    },

    // ── PATCH /5s/audits/:id/validate ─────────────────────────────────────────
    /**
     * Valida (aprova ou reprova) uma auditoria pendente.
     * Acesso restrito: MANAGER, ADMIN.
     *
     * O validatorUserId é extraído do JWT (request.currentUser.sub) e gravado
     * no banco junto com o novo status de validação e a ação corretiva.
     */
    async validateAudit(request: FastifyRequest, reply: FastifyReply) {
      const { id }  = auditIdParamSchema.parse(request.params)
      const body    = validateAuditBodySchema.parse(request.body)

      // Captura o ID do validador do JWT — o usuário que está fazendo a requisição
      const validatorId = request.currentUser.sub

      let result: Awaited<ReturnType<typeof fiveSService.validateAudit>>
      try {
        result = await fiveSService.validateAudit(id, body, validatorId)
      } catch (err) {
        rethrowDomain(err)
      }

      const isApproved = result.audit.validation === 'APROVADO'

      return reply.status(200).send({
        message: isApproved
          ? 'Auditoria aprovada com sucesso.'
          : 'Auditoria reprovada. Ação corretiva registrada.',
        audit: result.audit,
      })
    },

    // ── GET /5s/reports ────────────────────────────────────────────────────────
    /**
     * Retorna listagem filtrada de auditorias com KPIs e paginação.
     * Acesso: MANAGER, ADMIN.
     *
     * Query params disponíveis: worksiteId, status, validation,
     *   dateFrom, dateTo, page, limit.
     */
    async listReports(request: FastifyRequest, reply: FastifyReply) {
      const query = reportsQuerySchema.parse(request.query)

      const result = await fiveSService.listReports(query)

      return reply.status(200).send(result)
    },
  }
}
