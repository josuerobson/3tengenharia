// src/modules/assets/assets.service.ts
// Regras de negócio do módulo de Ferramentas & Patrimônio.

import { prisma } from '../../lib/prisma.js'
import type {
  CreateLoanBody,
  CreateMaintenanceLogBody,
  CreateAssetBody,
  ReturnLoanBody,
} from './assets.schema.js'

// ── Erros de domínio ──────────────────────────────────────────────────────────

export class DuplicateAssetTagError extends Error {
  readonly statusCode = 409
  constructor(tag: string) {
    super(`Código Patrimonial "${tag}" já cadastrado.`)
    this.name = 'DuplicateAssetTagError'
  }
}

export class DuplicateSerialNumberError extends Error {
  readonly statusCode = 409
  constructor(serial: string) {
    super(`Número de série "${serial}" já cadastrado.`)
    this.name = 'DuplicateSerialNumberError'
  }
}

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

export class LoanNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Empréstimo não encontrado: ${id}`)
    this.name = 'LoanNotFoundError'
  }
}

export class LoanAlreadyReturnedError extends Error {
  readonly statusCode = 409
  constructor(id: string) {
    super(`Este empréstimo (${id}) já foi devolvido.`)
    this.name = 'LoanAlreadyReturnedError'
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
  // ── GET /assets ───────────────────────────────────────────────────────────
  async list() {
    const assets = await prisma.asset.findMany({
      include: {
        loans: {
          where: { isReturned: false },
          include: {
            borrowerEmployee: {
              select: { fullName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return assets.map((asset) => ({
      id: asset.id,
      assetTag: asset.assetTag,
      description: asset.description,
      category: asset.category,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serialNumber,
      currentStatus: asset.currentStatus,
      location: asset.location,
      acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.toISOString().split('T')[0] : null,
      acquisitionValue: asset.acquisitionValue ? Number(asset.acquisitionValue) : null,
      notes: asset.notes,
      currentBorrowee: asset.loans[0]?.borrowerEmployee?.fullName ?? null,
      activeLoanId: asset.loans[0]?.id ?? null,
    }))
  },

  // ── POST /assets ──────────────────────────────────────────────────────────
  async create(body: CreateAssetBody) {
    // 1. Validar duplicidade de tag de patrimônio
    const existingTag = await prisma.asset.findUnique({
      where: { assetTag: body.assetTag }
    })
    if (existingTag) {
      throw new DuplicateAssetTagError(body.assetTag)
    }

    // 2. Validar duplicidade de serial (se fornecido)
    if (body.serialNumber) {
      const existingSerial = await prisma.asset.findUnique({
        where: { serialNumber: body.serialNumber }
      })
      if (existingSerial) {
        throw new DuplicateSerialNumberError(body.serialNumber)
      }
    }

    // 3. Criar e persistir o bem patrimonial
    return prisma.asset.create({
      data: {
        assetTag: body.assetTag,
        description: body.description,
        category: body.category,
        brand: body.brand || null,
        model: body.model || null,
        serialNumber: body.serialNumber || null,
        acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null,
        acquisitionValue: body.acquisitionValue !== undefined && body.acquisitionValue !== null ? body.acquisitionValue : null,
        location: body.location || null,
        notes: body.notes || null,
        currentStatus: 'AVAILABLE',
      }
    })
  },

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

  // ── POST /assets/loans/:id/return ──────────────────────────────────────────
  async returnLoan(loanId: string, body: ReturnLoanBody) {
    // 1. Busca o empréstimo ativo
    const loan = await prisma.assetLoan.findUnique({
      where: { id: loanId },
      include: { asset: { select: assetBaseSelect } },
    })

    if (!loan) throw new LoanNotFoundError(loanId)

    // 2. Valida que o empréstimo não foi retornado ainda
    if (loan.isReturned) {
      throw new LoanAlreadyReturnedError(loanId)
    }

    // 3. Atualiza o empréstimo
    const updatedLoan = await prisma.assetLoan.update({
      where: { id: loanId },
      data: {
        isReturned: true,
        returnedAt: body.returnedAt ?? new Date(),
        returnNotes: body.returnNotes ?? null,
      },
      include: {
        asset: { select: assetBaseSelect },
        borrowerEmployee: { select: { id: true, fullName: true, registration: true } },
      },
    })

    // 4. Atualiza o status do bem para AVAILABLE
    await prisma.asset.update({
      where: { id: loan.assetId },
      data: { currentStatus: 'AVAILABLE' },
    })

    return updatedLoan
  },

  // ── GET /assets/employees ──────────────────────────────────────────────────
  async listEmployees() {
    return prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        registration: true,
        position: true,
      },
      orderBy: { fullName: 'asc' },
    })
  },

  // ── GET /assets/worksites ──────────────────────────────────────────────────
  async listWorksites() {
    return prisma.worksite.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })
  },
}
