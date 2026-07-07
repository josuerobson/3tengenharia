// src/modules/assets/assets.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  createLoanBodySchema,
  createMaintenanceLogBodySchema,
  createAssetBodySchema,
  returnLoanBodySchema,
  resolveMaintenanceLogBodySchema,
  createCategoryBodySchema,
  editCategoryBodySchema,
  createAssetLoanRequestBodySchema,
  allocateAssetLoanRequestBodySchema,
  returnAssetLoanRequestBodySchema,
  validateReturnAssetLoanRequestBodySchema,
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

    // ── POST /assets/loans (legado) ──────────────────────────────────────────
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

    // ── POST /assets/loans/:id/return (legado) ────────────────────────────────
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

    // ── CATEGORIAS DINÂMICAS ──────────────────────────────────────────────────

    async listCategories(request: FastifyRequest, reply: FastifyReply) {
      const categories = await assetsService.listCategories()
      return reply.status(200).send(categories)
    },

    async createCategory(request: FastifyRequest, reply: FastifyReply) {
      const body = createCategoryBodySchema.parse(request.body)
      let category
      try {
        category = await assetsService.createCategory(body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(201).send(category)
    },

    async updateCategory(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = editCategoryBodySchema.parse(request.body)
      let category
      try {
        category = await assetsService.updateCategory(params.id, body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(200).send(category)
    },

    // ── FLUXO DE SOLICITAÇÃO (LOAN REQUESTS) ──────────────────────────────────

    async createLoanRequest(request: FastifyRequest, reply: FastifyReply) {
      const body = createAssetLoanRequestBodySchema.parse(request.body)
      const userId = request.currentUser.sub
      let loanRequest
      try {
        loanRequest = await assetsService.createLoanRequest(userId, body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(201).send(loanRequest)
    },

    async listLoanRequests(request: FastifyRequest, reply: FastifyReply) {
      const userId = request.currentUser.sub
      const role = request.currentUser.role
      const requests = await assetsService.listLoanRequests(userId, role)
      return reply.status(200).send(requests)
    },

    async allocateLoanRequest(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = allocateAssetLoanRequestBodySchema.parse(request.body)
      const userId = request.currentUser.sub
      let loanRequest
      try {
        loanRequest = await assetsService.allocateLoanRequest(params.id, userId, body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(200).send({
        message: 'Patrimônio físico alocado e enviado com sucesso.',
        loanRequest
      })
    },

    async submitReturn(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = returnAssetLoanRequestBodySchema.parse(request.body)
      const userId = request.currentUser.sub
      let loanRequest
      try {
        loanRequest = await assetsService.submitReturn(params.id, userId, body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(200).send({
        message: 'Devolução registrada. O bem agora está em trânsito de retorno.',
        loanRequest
      })
    },

    async validateReturn(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = validateReturnAssetLoanRequestBodySchema.parse(request.body)
      const userId = request.currentUser.sub
      let loanRequest
      try {
        loanRequest = await assetsService.validateReturn(params.id, userId, body)
      } catch (err: any) {
        return reply.status(400).send({ message: err.message })
      }
      return reply.status(200).send({
        message: `Devolução validada com sucesso como: ${body.validationStatus}.`,
        loanRequest
      })
    }
  }
}
