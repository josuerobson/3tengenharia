// src/modules/assets/assets.service.ts
// Regras de negócio do módulo de Ferramentas & Patrimônio.

import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import type {
  CreateMaintenanceLogBody,
  CreateAssetBody,
  ReturnLoanBody,
  ResolveMaintenanceLogBody,
  CreateCategoryBody,
  EditCategoryBody,
  CreateAssetLoanRequestBody,
  CreateAssetLoanRequestBatchBody,
  AllocateAssetLoanRequestBody,
  AllocateAssetLoanRequestBatchBody,
  ReturnAssetLoanRequestBody,
  ValidateReturnAssetLoanRequestBody,
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
  categoryId: true,
  legacyCategory: true,
  currentStatus: true,
  location: true,
  photoUrl: true,
} as const

/** Achata o registro de bem patrimonial (com relação `category`/`loans` opcionais) para o formato exposto pela API. */
function mapAssetToResponse(asset: {
  id: string
  assetTag: string
  description: string
  categoryId: string | null
  category?: { name: string } | null
  legacyCategory: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  currentStatus: string
  location: string | null
  acquisitionDate: Date | null
  acquisitionValue: unknown
  notes: string | null
  photoUrl: string | null
  loans?: { id: string; borrowerEmployee?: { fullName: string } | null }[]
}) {
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    description: asset.description,
    categoryId: asset.categoryId,
    category: asset.category?.name ?? asset.legacyCategory ?? 'Outros',
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber,
    currentStatus: asset.currentStatus,
    location: asset.location,
    acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.toISOString().split('T')[0] : null,
    acquisitionValue: asset.acquisitionValue !== null && asset.acquisitionValue !== undefined ? Number(asset.acquisitionValue as number) : null,
    notes: asset.notes,
    photoUrl: asset.photoUrl,
    currentBorrowee: asset.loans?.[0]?.borrowerEmployee?.fullName ?? null,
    activeLoanId: asset.loans?.[0]?.id ?? null,
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const assetsService = {
  // ── GET /assets ───────────────────────────────────────────────────────────
  async list() {
    const assets = await prisma.asset.findMany({
      include: {
        category: true,
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

    return assets.map(mapAssetToResponse)
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

    // 3. Validar se a categoria existe
    const category = await prisma.assetCategory.findUnique({
      where: { id: body.categoryId }
    })
    if (!category) {
      throw new Error(`Categoria informada não existe no banco de dados.`)
    }

    // 4. Criar e persistir o bem patrimonial
    const created = await prisma.asset.create({
      data: {
        assetTag: body.assetTag,
        description: body.description,
        categoryId: body.categoryId,
        brand: body.brand || null,
        model: body.model || null,
        serialNumber: body.serialNumber || null,
        acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null,
        acquisitionValue: body.acquisitionValue !== undefined && body.acquisitionValue !== null ? body.acquisitionValue : null,
        location: body.location || null,
        notes: body.notes || null,
        photoUrl: body.photoUrl || null,
        currentStatus: 'AVAILABLE',
      },
      include: {
        category: true
      }
    })

    return mapAssetToResponse(created)
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
        asset: {
          include: { category: true }
        },
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

  // ── POST /assets/loans/:id/return (legado) ─────────────────────────────────
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
        returnPhotoUrl: body.returnPhotoUrl ?? null,
      },
      include: {
        asset: {
          include: { category: true }
        },
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
        cnhExpirationDate: true,
      },
      orderBy: { fullName: 'asc' },
    })
  },

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

  // ── POST /assets/maintenance/resolve ───────────────────────────────────────
  async resolveMaintenanceLog(
    body: ResolveMaintenanceLogBody,
    resolvedByUserId: string | null,
  ) {
    // 1. Busca o bem patrimonial
    const asset = await prisma.asset.findUnique({
      where: { id: body.assetId },
      include: {
        maintenanceLogs: {
          where: { maintenanceStatus: { in: ['OPEN', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!asset) throw new AssetNotFoundError(body.assetId)

    // Encontra o log ativo de manutenção
    const activeLog = asset.maintenanceLogs[0]
    if (!activeLog) {
      throw new Error(`Não há chamados de manutenção em aberto para o bem "${asset.assetTag}".`)
    }

    // 2. Atualiza o log de manutenção
    const updatedLog = await prisma.assetMaintenanceLog.update({
      where: { id: activeLog.id },
      data: {
        resolutionNotes: body.resolutionNotes,
        repairCost: body.repairCost,
        maintenanceStatus: body.action,
        resolvedAt: new Date(),
      },
      include: {
        asset: {
          include: { category: true }
        },
      },
    })

    // 3. Atualiza o status do bem patrimonial
    const nextStatus = body.action === 'RESOLVED' ? 'AVAILABLE' : 'WRITTEN_OFF'
    await prisma.asset.update({
      where: { id: body.assetId },
      data: { currentStatus: nextStatus },
    })

    return updatedLog
  },

  // ── GERENCIAMENTO DE CATEGORIAS DINÂMICAS ───────────────────────────────────

  async listCategories() {
    return prisma.assetCategory.findMany({
      orderBy: { name: 'asc' }
    })
  },

  async createCategory(body: CreateCategoryBody) {
    const name = body.name.trim()
    const exists = await prisma.assetCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })
    if (exists) {
      throw new Error(`Categoria "${name}" já cadastrada.`)
    }
    return prisma.assetCategory.create({
      data: { name, isActive: true }
    })
  },

  async updateCategory(id: string, body: EditCategoryBody) {
    const category = await prisma.assetCategory.findUnique({
      where: { id }
    })
    if (!category) {
      throw new Error('Categoria não encontrada.')
    }

    if (body.name) {
      const name = body.name.trim()
      const exists = await prisma.assetCategory.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          id: { not: id }
        }
      })
      if (exists) {
        throw new Error(`Categoria "${name}" já cadastrada.`)
      }
    }

    const updateData: any = {}
    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    return prisma.assetCategory.update({
      where: { id },
      data: updateData
    })
  },

  // ── FLUXO DE SOLICITAÇÃO E DEVOLUÇÃO (NOVO) ─────────────────────────────────

  async createLoanRequest(requesterUserId: string, body: CreateAssetLoanRequestBody) {
    // 1. Encontra o colaborador associado ao usuário logado
    const user = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { employee: true }
    })
    if (!user?.employee) {
      throw new Error('Somente usuários colaboradores vinculados podem abrir solicitações.')
    }

    // 2. Valida se a categoria existe e está ativa
    const category = await prisma.assetCategory.findUnique({
      where: { id: body.categoryId }
    })
    if (!category || !category.isActive) {
      throw new Error('Categoria solicitada inválida ou inativa.')
    }

    // 3. Cria a solicitação pendente
    return prisma.assetLoanRequest.create({
      data: {
        requesterEmployeeId: user.employee.id,
        categoryId: body.categoryId,
        destinationWorksiteId: body.destinationWorksiteId ?? null,
        requestNotes: body.requestNotes ?? null,
        status: 'PENDING'
      },
      include: {
        category: true,
        requesterEmployee: true,
        destinationWorksite: true
      }
    })
  },

  // ── Solicitação com múltiplos equipamentos/quantidades em um único pedido ────
  async createLoanRequestBatch(requesterUserId: string, body: CreateAssetLoanRequestBatchBody) {
    // 1. Encontra o colaborador associado ao usuário logado
    const user = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { employee: true }
    })
    if (!user?.employee) {
      throw new Error('Somente usuários colaboradores vinculados podem abrir solicitações.')
    }

    // 2. Valida todas as categorias antes de criar qualquer coisa
    const categoryIds = [...new Set(body.items.map((item) => item.categoryId))]
    const categories = await prisma.assetCategory.findMany({
      where: { id: { in: categoryIds } }
    })
    for (const item of body.items) {
      const category = categories.find((c) => c.id === item.categoryId)
      if (!category || !category.isActive) {
        throw new Error('Uma ou mais categorias solicitadas são inválidas ou estão inativas.')
      }
    }

    // 3. Expande cada item (categoria + quantidade) em uma solicitação individual por unidade,
    // já que a devolução de cada bem continua sendo unitária.
    const batchId = randomUUID()
    const employeeId = user.employee.id
    const rowsToCreate = body.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        requesterEmployeeId: employeeId,
        categoryId: item.categoryId,
        destinationWorksiteId: body.destinationWorksiteId ?? null,
        requestNotes: body.requestNotes ?? null,
        status: 'PENDING' as const,
        batchId,
      })),
    )

    await prisma.assetLoanRequest.createMany({ data: rowsToCreate })

    return prisma.assetLoanRequest.findMany({
      where: { batchId },
      include: {
        category: true,
        requesterEmployee: true,
        destinationWorksite: true
      },
      orderBy: { createdAt: 'asc' }
    })
  },

  async listLoanRequests(userId: string, isOwnScoped: boolean) {
    // Perfis com escopo pessoal só veem as próprias solicitações
    if (isOwnScoped) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true }
      })
      if (!user?.employee) return []

      return prisma.assetLoanRequest.findMany({
        where: { requesterEmployeeId: user.employee.id },
        include: {
          category: true,
          requesterEmployee: true,
          destinationWorksite: true,
          allocatedAsset: {
            include: { category: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Admins e Gestores visualizam todas
    return prisma.assetLoanRequest.findMany({
      include: {
        category: true,
        requesterEmployee: true,
        destinationWorksite: true,
        allocatedAsset: {
          include: { category: true }
        },
        checkoutByUser: { select: { email: true } },
        validatedByUser: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  async allocateLoanRequest(requestId: string, checkoutByUserId: string, body: AllocateAssetLoanRequestBody) {
    // 1. Busca a solicitação
    const request = await prisma.assetLoanRequest.findUnique({
      where: { id: requestId }
    })
    if (!request) {
      throw new Error('Solicitação de empréstimo não encontrada.')
    }
    if (request.status !== 'PENDING') {
      throw new Error('Esta solicitação não está pendente para atendimento.')
    }

    // 2. Busca o bem físico e valida se está disponível
    const asset = await prisma.asset.findUnique({
      where: { id: body.allocatedAssetId }
    })
    if (!asset) {
      throw new Error('Patrimônio físico não encontrado.')
    }
    if (asset.currentStatus !== 'AVAILABLE') {
      throw new Error(`O patrimônio "${asset.assetTag}" não está disponível para envio. Status: ${asset.currentStatus}`)
    }

    // 3. Atualiza a solicitação com a alocação e as fotos do estado de envio
    const updatedRequest = await prisma.assetLoanRequest.update({
      where: { id: requestId },
      data: {
        status: 'LOANED',
        allocatedAssetId: body.allocatedAssetId,
        checkoutPhoto1: body.checkoutPhoto1 ?? null,
        checkoutPhoto2: body.checkoutPhoto2 ?? null,
        checkoutPhoto3: body.checkoutPhoto3 ?? null,
        checkoutPhoto4: body.checkoutPhoto4 ?? null,
        checkoutNotes: body.checkoutNotes ?? null,
        checkoutAt: new Date(),
        checkoutByUserId
      },
      include: {
        category: true,
        requesterEmployee: true,
        destinationWorksite: true,
        allocatedAsset: true
      }
    })

    // 4. Atualiza o status do bem físico para LOANED
    await prisma.asset.update({
      where: { id: body.allocatedAssetId },
      data: { currentStatus: 'LOANED' }
    })

    // 5. Cria registro legado de empréstimo (AssetLoan) para compatibilidade de histórico
    await prisma.assetLoan.create({
      data: {
        assetId: body.allocatedAssetId,
        borrowerEmployeeId: request.requesterEmployeeId,
        destinationWorksiteId: request.destinationWorksiteId,
        checkoutAt: new Date(),
        checkoutNotes: body.checkoutNotes ?? `Vinculado via Solicitação: ${requestId}`,
        createdByUserId: checkoutByUserId,
        isReturned: false
      }
    })

    return updatedRequest
  },

  // ── Aloca e envia todas as unidades de um lote (pedido com múltiplos itens) ──
  async allocateLoanRequestBatch(checkoutByUserId: string, body: AllocateAssetLoanRequestBatchBody) {
    const requestIds = body.allocations.map((a) => a.requestId)
    const assetIds = body.allocations.map((a) => a.allocatedAssetId)

    // 1. Não permite vincular o mesmo bem físico a mais de um item nesta submissão
    if (new Set(assetIds).size !== assetIds.length) {
      throw new Error('Não é possível vincular o mesmo bem físico a mais de um item da solicitação.')
    }

    // 2. Pré-valida todas as solicitações antes de aplicar qualquer alteração
    const requests = await prisma.assetLoanRequest.findMany({
      where: { id: { in: requestIds } }
    })
    for (const alloc of body.allocations) {
      const req = requests.find((r) => r.id === alloc.requestId)
      if (!req) {
        throw new Error(`Solicitação ${alloc.requestId} não encontrada.`)
      }
      if (req.status !== 'PENDING') {
        throw new Error('Uma ou mais solicitações deste pedido já não estão mais pendentes.')
      }
    }

    // 3. Pré-valida todos os bens físicos antes de aplicar qualquer alteração
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } }
    })
    for (const alloc of body.allocations) {
      const asset = assets.find((a) => a.id === alloc.allocatedAssetId)
      if (!asset) {
        throw new Error(`Bem patrimonial ${alloc.allocatedAssetId} não encontrado.`)
      }
      if (asset.currentStatus !== 'AVAILABLE') {
        throw new Error(`O patrimônio "${asset.assetTag}" não está disponível para envio. Status: ${asset.currentStatus}`)
      }
    }

    // 4. Aplica cada alocação reaproveitando a mesma lógica do fluxo individual
    const updatedRequests = []
    for (const alloc of body.allocations) {
      const updated = await this.allocateLoanRequest(alloc.requestId, checkoutByUserId, {
        allocatedAssetId: alloc.allocatedAssetId,
        checkoutPhoto1: alloc.checkoutPhoto1 ?? null,
        checkoutPhoto2: alloc.checkoutPhoto2 ?? null,
        checkoutPhoto3: alloc.checkoutPhoto3 ?? null,
        checkoutPhoto4: alloc.checkoutPhoto4 ?? null,
        checkoutNotes: alloc.checkoutNotes ?? null,
      })
      updatedRequests.push(updated)
    }

    return updatedRequests
  },

  async submitReturn(requestId: string, requesterUserId: string, body: ReturnAssetLoanRequestBody) {
    // 1. Busca a solicitação
    const request = await prisma.assetLoanRequest.findUnique({
      where: { id: requestId },
      include: { requesterEmployee: true }
    })
    if (!request) {
      throw new Error('Solicitação de empréstimo não encontrada.')
    }
    if (request.status !== 'LOANED') {
      throw new Error('Esta solicitação não está sob empréstimo ativo.')
    }

    // Valida se o solicitante é quem está devolvendo ou se é gestor/admin
    const user = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { employee: true }
    })
    const isRequester = user?.employee?.id === request.requesterEmployeeId
    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role?.startsWith('MANAGER')
    if (!isRequester && !isManagerOrAdmin) {
      throw new Error('Somente o funcionário detentor do empréstimo ou um gestor pode devolvê-lo.')
    }

    if (!request.allocatedAssetId) {
      throw new Error('Não há patrimônio alocado a esta solicitação.')
    }

    // 2. Registra o checklist e altera o status da solicitação para RETURNING (em trânsito)
    const updatedRequest = await prisma.assetLoanRequest.update({
      where: { id: requestId },
      data: {
        status: 'RETURNING',
        returnNotes: body.returnNotes ?? null,
        returnPhoto1: body.returnPhoto1,
        returnPhoto2: body.returnPhoto2 ?? null,
        returnPhoto3: body.returnPhoto3 ?? null,
        returnPhoto4: body.returnPhoto4 ?? null,
        isWorking: body.isWorking,
        hasDamage: body.hasDamage,
        returnedAt: new Date()
      },
      include: {
        category: true,
        requesterEmployee: true,
        allocatedAsset: true
      }
    })

    // 3. Atualiza o status do bem físico no inventário para RETURNING
    await prisma.asset.update({
      where: { id: request.allocatedAssetId },
      data: { currentStatus: 'RETURNING' }
    })

    return updatedRequest
  },

  async validateReturn(requestId: string, validatedByUserId: string, body: ValidateReturnAssetLoanRequestBody) {
    // 1. Busca a solicitação
    const request = await prisma.assetLoanRequest.findUnique({
      where: { id: requestId }
    })
    if (!request) {
      throw new Error('Solicitação de empréstimo não encontrada.')
    }
    if (request.status !== 'RETURNING') {
      throw new Error('Esta devolução não está em trânsito de retorno para ser validada.')
    }

    if (!request.allocatedAssetId) {
      throw new Error('Não há patrimônio físico vinculado a esta solicitação.')
    }

    // 2. Atualiza a solicitação com a validação da devolução
    const updatedRequest = await prisma.assetLoanRequest.update({
      where: { id: requestId },
      data: {
        status: 'RETURNED',
        validationNotes: body.validationNotes ?? null,
        validationPhoto1: body.validationPhoto1 ?? null,
        validationPhoto2: body.validationPhoto2 ?? null,
        validationPhoto3: body.validationPhoto3 ?? null,
        validationPhoto4: body.validationPhoto4 ?? null,
        validatedAt: new Date(),
        validatedByUserId,
        validationStatus: body.validationStatus
      },
      include: {
        category: true,
        requesterEmployee: true,
        allocatedAsset: true
      }
    })

    // 3. Define o status do bem patrimonial
    let nextStatus: 'AVAILABLE' | 'DAMAGED'
    if (body.validationStatus === 'OK' || body.validationStatus === 'OK_WITH_DAMAGE') {
      nextStatus = 'AVAILABLE'
    } else {
      nextStatus = 'DAMAGED'
    }

    await prisma.asset.update({
      where: { id: request.allocatedAssetId },
      data: { currentStatus: nextStatus }
    })

    // 4. Encerra o empréstimo legado correspondente
    const activeLoan = await prisma.assetLoan.findFirst({
      where: {
        assetId: request.allocatedAssetId,
        isReturned: false
      }
    })
    if (activeLoan) {
      await prisma.assetLoan.update({
        where: { id: activeLoan.id },
        data: {
          isReturned: true,
          returnedAt: new Date(),
          returnNotes: body.validationNotes ?? `Validado via Solicitação: ${body.validationStatus}`,
          returnPhotoUrl: body.validationPhoto1 ?? request.returnPhoto1
        }
      })
    }

    // 5. Se houver avarias reportadas pelo gestor na devolução, registra histórico de avaria (legado)
    if (body.validationStatus === 'DEFECTIVE' || body.validationStatus === 'OK_WITH_DAMAGE') {
      await prisma.assetMaintenanceLog.create({
        data: {
          assetId: request.allocatedAssetId,
          issueDescription: body.validationNotes ?? `Identificado no recebimento da devolução: ${body.validationStatus}`,
          defectPhotoUrl: body.validationPhoto1 ?? request.returnPhoto1 ?? null,
          reportedByUserId: validatedByUserId,
          reportedAt: new Date(),
          maintenanceStatus: body.validationStatus === 'DEFECTIVE' ? 'OPEN' : 'RESOLVED',
          resolutionNotes: body.validationStatus === 'OK_WITH_DAMAGE' ? 'Item recebido com avarias cosméticas/desgaste, mas funcionando.' : null
        }
      })
    }

    return updatedRequest
  }
}
