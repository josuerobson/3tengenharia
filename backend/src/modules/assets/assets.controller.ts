// src/modules/assets/assets.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  createLoanBodySchema,
  createMaintenanceLogBodySchema,
  createAssetBodySchema,
} from './assets.schema.js'
import {
  assetsService,
  AssetNotFoundError,
  AssetNotAvailableError,
  AssetWrittenOffError,
  EmployeeNotFoundError,
  DuplicateAssetTagError,
  DuplicateSerialNumberError,
} from './assets.service.js'

const DOMAIN_ERRORS = [
  AssetNotFoundError,
  AssetNotAvailableError,
  AssetWrittenOffError,
  EmployeeNotFoundError,
  DuplicateAssetTagError,
  DuplicateSerialNumberError,
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
  }
}
