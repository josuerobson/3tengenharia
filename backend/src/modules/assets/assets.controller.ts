// src/modules/assets/assets.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  createLoanBodySchema,
  createMaintenanceLogBodySchema,
  createAssetBodySchema,
  returnLoanBodySchema,
  resolveMaintenanceLogBodySchema,
} from './assets.schema.js'
import {
  assetsService,
  AssetNotFoundError,
  AssetNotAvailableError,
  AssetWrittenOffError,
  EmployeeNotFoundError,
  DuplicateAssetTagError,
  DuplicateSerialNumberError,
  LoanNotFoundError,
  LoanAlreadyReturnedError,
} from './assets.service.js'

const DOMAIN_ERRORS = [
  AssetNotFoundError,
  AssetNotAvailableError,
  AssetWrittenOffError,
  EmployeeNotFoundError,
  DuplicateAssetTagError,
  DuplicateSerialNumberError,
  LoanNotFoundError,
  LoanAlreadyReturnedError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function assetsController(_app: FastifyInstance) {
  return {
    // ── GET /assets ──────────────────────────────────────────────────────────
    async listAssets(request: FastifyRequest, reply: FastifyReply) {
      const assets = await assetsService.list()
      return reply.status(200).send(assets)
    },

    // ── POST /assets ─────────────────────────────────────────────────────────
    async createAsset(request: FastifyRequest, reply: FastifyReply) {
      const body = createAssetBodySchema.parse(request.body)
      let asset: Awaited<ReturnType<typeof assetsService.create>>
      try {
        asset = await assetsService.create(body)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(201).send(asset)
    },

    // ── POST /assets/loans ───────────────────────────────────────────────────
    async createLoan(request: FastifyRequest, reply: FastifyReply) {
      const body = createLoanBodySchema.parse(request.body)
      const userId = request.currentUser.sub

      let loan: Awaited<ReturnType<typeof assetsService.createLoan>>
      try {
        loan = await assetsService.createLoan(body, userId)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(201).send({
        message: `Saída do bem "${loan.asset.assetTag}" registrada com sucesso. Status atualizado para LOANED.`,
        loan,
      })
    },

    // ── POST /assets/loans/:id/return ────────────────────────────────────────
    async returnLoan(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = returnLoanBodySchema.parse(request.body)

      let loan: Awaited<ReturnType<typeof assetsService.returnLoan>>
      try {
        loan = await assetsService.returnLoan(params.id, body)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send({
        message: `Devolução do bem "${loan.asset.assetTag}" registrada com sucesso. Status atualizado para AVAILABLE.`,
        loan,
      })
    },

    // ── POST /assets/maintenance ─────────────────────────────────────────────
    async createMaintenanceLog(request: FastifyRequest, reply: FastifyReply) {
      const body = createMaintenanceLogBodySchema.parse(request.body)
      const userId = request.currentUser.sub

      let result: Awaited<
        ReturnType<typeof assetsService.createMaintenanceLog>
      >
      try {
        result = await assetsService.createMaintenanceLog(body, userId)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(201).send({
        message:
          `Chamado de avaria aberto para "${result.asset.assetTag}". ` +
          `Status alterado de ${result.previousStatus} → MAINTENANCE.`,
        maintenanceLog: result,
      })
    },

    // ── GET /assets/employees ────────────────────────────────────────────────
    async listEmployees(request: FastifyRequest, reply: FastifyReply) {
      const employees = await assetsService.listEmployees()
      return reply.status(200).send(employees)
    },

    // ── GET /assets/worksites ────────────────────────────────────────────────
    async listWorksites(request: FastifyRequest, reply: FastifyReply) {
      const worksites = await assetsService.listWorksites()
      return reply.status(200).send(worksites)
    },

    // ── POST /assets/maintenance/resolve ─────────────────────────────────────
    async resolveMaintenanceLog(request: FastifyRequest, reply: FastifyReply) {
      const body = resolveMaintenanceLogBodySchema.parse(request.body)
      const userId = request.currentUser.sub

      let result
      try {
        result = await assetsService.resolveMaintenanceLog(body, userId)
      } catch (err) {
        rethrowDomain(err)
      }

      return reply.status(200).send({
        message:
          `Manutenção resolvida para o bem "${result.asset.assetTag}". ` +
          `Status do bem alterado para ${result.asset.currentStatus}.`,
        maintenanceLog: result,
      })
    },
  }
}
