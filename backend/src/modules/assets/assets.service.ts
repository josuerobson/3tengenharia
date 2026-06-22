// src/modules/assets/assets.service.ts
// Regras de negócio do módulo de Ferramentas & Patrimônio.

import { prisma } from '../../lib/prisma.js'
import type {
  CreateLoanBody,
  CreateMaintenanceLogBody,
} from './assets.schema.js'

// ── Erros de domínio ──────────────────────────────────────────────────────────

export class AssetNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Bem patrimonial não encontrado: ${id}`)
    this.name = 'AssetNotFoundError'
  }
}

export class AssetNotAvailableError extends Error {
  readonly statusCode = 409
  constructor(assetTag: string, status: string) {
    super(
      `O bem "${assetTag}" não está disponível para empréstimo. ` +
        `Status atual: ${status}. Somente bens com status AVAILABLE podem ser emprestados.`,
    )
    this.name = 'AssetNotAvailableError'
  }
}

export class AssetWrittenOffError extends Error {
  readonly statusCode = 409
  constructor(assetTag: string) {
    super(
      `O bem "${assetTag}" está em manutenção (MAINTENANCE) e não aceita novos chamados de avaria. ` +
      'Finalize o chamado em aberto antes de registrar um novo.',
    )
    this.name = 'AssetWrittenOffError'
  }
}

export class EmployeeNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Colaborador não encontrado: ${id}`)
    this.name = 'EmployeeNotFoundError'
  }
}

// ── Seletor de bem patrimonial ────────────────────────────────────────────────

const assetBaseSelect = {
  id: true,
  assetTag: true,
  description: true,
  category: true,
  currentStatus: true,
  location: true,
} as const

// ── Service ───────────────────────────────────────────────────────────────────

export const assetsService = {
  // ── POST /assets/loans ────────────────────────────────────────────────────
  async createLoan(body: CreateLoanBody, createdByUserId: string | null) {
    // 1. Busca o bem patrimonial
    const asset = await prisma.asset.findUnique({
      where: { id: body.assetId },
      select: assetBaseSelect,
    })

    if (!asset) throw new AssetNotFoundError(body.assetId)

    // 2. ⚙️ REGRA DE NEGÓCIO: Bem deve estar AVAILABLE para ser emprestado
    if (asset.currentStatus !== 'AVAILABLE') {
      throw new AssetNotAvailableError(asset.assetTag, asset.currentStatus)
    }

    // 3. Valida que o colaborador existe
    const borrower = await prisma.employee.findUnique({
      where: { id: body.borrowerEmployeeId, isActive: true },
      select: { id: true, fullName: true, registration: true },
    })

    if (!borrower) throw new EmployeeNotFoundError(body.borrowerEmployeeId)

    // 4. Cria o empréstimo com include das relações
    const loan = await prisma.assetLoan.create({
      data: {
        assetId: body.assetId,
        borrowerEmployeeId: body.borrowerEmployeeId,
        destinationWorksiteId: body.destinationWorksiteId ?? null,
        createdByUserId,
        checkoutAt: new Date(),
        expectedReturnAt: body.expectedReturnAt ?? null,
        checkoutNotes: body.checkoutNotes ?? null,
        isReturned: false,
      },
      include: {
        asset: { select: assetBaseSelect },
        borrowerEmployee: {
          select: { id: true, fullName: true, registration: true },
        },
        destinationWorksite: { select: { id: true, code: true, name: true } },
      },
    })

    // ⚙️ REGRA DE NEGÓCIO: Atualiza status do bem para LOANED
    await prisma.asset.update({
      where: { id: body.assetId },
      data: { currentStatus: 'LOANED' },
    })

    return loan
  },

  // ── POST /assets/maintenance ──────────────────────────────────────────────
  async createMaintenanceLog(
    body: CreateMaintenanceLogBody,
    reportedByUserId: string | null,
  ) {
    // 1. Busca o bem patrimonial
    const asset = await prisma.asset.findUnique({
      where: { id: body.assetId },
      select: assetBaseSelect,
    })

    if (!asset) throw new AssetNotFoundError(body.assetId)

    // 2. ⚙️ REGRA DE NEGÓCIO: Bens já em manutenção não aceitam novos chamados
    if (asset.currentStatus === 'MAINTENANCE') {
      throw new AssetWrittenOffError(asset.assetTag)
    }

    // 3. Cria o log de manutenção com include
    const maintenanceLog = await prisma.assetMaintenanceLog.create({
      data: {
        assetId: body.assetId,
        issueDescription: body.issueDescription,
        defectPhotoUrl: body.defectPhotoUrl ?? null,
        maintenanceStatus: 'OPEN',
        reportedByUserId,
        reportedAt: new Date(),
      },
      include: {
        asset: { select: assetBaseSelect },
      },
    })

    // ⚙️ REGRA DE NEGÓCIO: Muda status imediatamente para MAINTENANCE
    await prisma.asset.update({
      where: { id: body.assetId },
      data: { currentStatus: 'MAINTENANCE' },
    })

    return {
      ...maintenanceLog,
      // Status anterior para referência no response
      previousStatus: asset.currentStatus,
    }
  },
}
