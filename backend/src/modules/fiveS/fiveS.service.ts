// src/modules/fiveS/fiveS.service.ts
// Regras de negócio do Módulo 5S — Auditorias de Organização.
// Controllers são thin wrappers; toda lógica e acesso ao banco vivem aqui.

import { AuditStatus5S, ValidationStatus5S } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type {
  CreateAuditBody,
  ValidateAuditBody,
  ReportsQuery,
} from './fiveS.schema.js'

// ── Erros de domínio tipados ──────────────────────────────────────────────────
// Seguem o padrão do projeto: subclasses de Error com `statusCode` explícito
// para que o error-handler global serialize corretamente.

export class AuditNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Auditoria 5S não encontrada: ${id}`)
    this.name = 'AuditNotFoundError'
  }
}

export class AuditAlreadyValidatedError extends Error {
  readonly statusCode = 409
  constructor(id: string, currentValidation: ValidationStatus5S) {
    super(
      `A auditoria ${id} já foi validada com status "${currentValidation}". ` +
        'Apenas auditorias com status AGUARDANDO_AVALIACAO podem ser avaliadas.',
    )
    this.name = 'AuditAlreadyValidatedError'
  }
}

export class WorksiteNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Obra não encontrada: ${id}`)
    this.name = 'WorksiteNotFoundError'
  }
}

export class EmployeeNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(
      `Funcionário não encontrado ou inativo: ${id}. ` +
        'O usuário autenticado deve ter um registro de colaborador ativo para criar auditorias.',
    )
    this.name = 'EmployeeNotFoundError'
  }
}

// ── Tipo de retorno de criação (subset seguro para a API) ─────────────────────

// Prisma select shapes — inferidos a partir das queries para garantir type-safety.
type AuditWithPhotos = Awaited<ReturnType<typeof fiveSService.createAudit>>['audit']
type AuditSummary    = Awaited<ReturnType<typeof fiveSService.listReports>>['data'][number]

// ── Service ───────────────────────────────────────────────────────────────────

export const fiveSService = {
  // ── POST /5s/audits ──────────────────────────────────────────────────────────
  /**
   * Cria uma auditoria 5S e salva todas as fotos atomicamente.
   *
   * ⚙️ REGRA DE NEGÓCIO:
   * - O auditor deve ser um colaborador ativo (Employee) vinculado ao usuário logado.
   * - A obra (Worksite) deve existir e estar ativa.
   * - A criação do Audit5S + todas as AuditPhoto5S ocorre em uma única transação
   *   para garantir que nunca exista auditoria sem foto ou foto órfã.
   *
   * @param body       Payload validado pelo Zod
   * @param userId     ID do usuário logado (request.currentUser.sub)
   * @param employeeId ID do colaborador do JWT (request.currentUser.employeeId)
   */
  async createAudit(
    body: CreateAuditBody,
    userId: string,
    employeeId: string | null,
  ) {
    // 1. O usuário logado precisa ter um vínculo com Employee
    if (!employeeId) {
      throw new EmployeeNotFoundError(userId)
    }

    // 2. Valida que a obra existe e está ativa
    const worksite = await prisma.worksite.findFirst({
      where: { id: body.worksiteId, isActive: true },
      select: { id: true, name: true, code: true },
    })
    if (!worksite) throw new WorksiteNotFoundError(body.worksiteId)

    // 3. Valida que o colaborador existe e está ativo
    const auditor = await prisma.employee.findFirst({
      where: { id: employeeId, isActive: true },
      select: { id: true, fullName: true, registration: true },
    })
    if (!auditor) throw new EmployeeNotFoundError(employeeId)

    // 4. ⚙️ Transação atômica: Audit5S + N registros de AuditPhoto5S
    //    Garante consistência: se qualquer operação falhar, nenhuma persiste.
    const audit = await prisma.$transaction(async (tx) => {
      // 4a. Cria o registro principal da auditoria
      const createdAudit = await tx.audit5S.create({
        data: {
          worksiteId:       body.worksiteId,
          auditorEmployeeId: employeeId,
          areaType:         body.areaType,
          // description é String no Prisma (não opcional no DDL);
          // para auditorias CONFORME onde a descrição não é obrigatória, persiste string vazia.
          description:      body.description?.trim() ?? '',
          status:           body.status,
          // validation fica como AGUARDANDO_AVALIACAO (@default no schema)
        },
        select: {
          id:         true,
          areaType:   true,
          status:     true,
          validation: true,
          description: true,
          createdAt:  true,
          worksite: {
            select: { id: true, name: true, code: true },
          },
          auditorEmployee: {
            select: { id: true, fullName: true, registration: true },
          },
        },
      })

      // 4b. Cria todos os registros de foto em lote
      await tx.auditPhoto5S.createMany({
        data: body.photoUrls.map((url) => ({
          auditId:  createdAudit.id,
          photoUrl: url,
        })),
      })

      // 4c. Retorna o audit com fotos para a resposta
      return tx.audit5S.findUniqueOrThrow({
        where: { id: createdAudit.id },
        select: {
          id:              true,
          areaType:        true,
          status:          true,
          validation:      true,
          description:     true,
          correctiveAction: true,
          createdAt:       true,
          worksite: {
            select: { id: true, name: true, code: true },
          },
          auditorEmployee: {
            select: { id: true, fullName: true, registration: true },
          },
          photos: {
            select: { id: true, photoUrl: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    })

    return { audit }
  },

  // ── PATCH /5s/audits/:id/validate ────────────────────────────────────────────
  /**
   * Valida uma auditoria 5S pendente — exclusivo do Setor de Qualidade.
   *
   * ⚙️ REGRAS DE NEGÓCIO:
   * - Apenas auditorias com validation === AGUARDANDO_AVALIACAO podem ser validadas.
   *   Tentar validar novamente gera conflito 409.
   * - O ID do validador é capturado do JWT (request.currentUser.sub) e salvo.
   * - correctiveAction obrigatória para REPROVADO (garantida no schema Zod,
   *   verificada novamente aqui como defesa em profundidade).
   *
   * @param auditId     ID da auditoria a ser validada
   * @param body        Payload validado pelo Zod
   * @param validatorId ID do usuário validador (request.currentUser.sub)
   */
  async validateAudit(
    auditId: string,
    body: ValidateAuditBody,
    validatorId: string,
  ) {
    // 1. Busca a auditoria
    const audit = await prisma.audit5S.findUnique({
      where: { id: auditId },
      select: {
        id:         true,
        validation: true,
        status:     true,
        worksite: { select: { id: true, name: true } },
      },
    })
    if (!audit) throw new AuditNotFoundError(auditId)

    // 2. ⚙️ REGRA DE NEGÓCIO: somente AGUARDANDO_AVALIACAO pode ser validado
    if (audit.validation !== ValidationStatus5S.AGUARDANDO_AVALIACAO) {
      throw new AuditAlreadyValidatedError(auditId, audit.validation)
    }

    // 3. Defesa em profundidade: re-valida correctiveAction para REPROVADO
    //    (o schema Zod já garante isso, mas protege contra chamadas diretas ao service)
    if (
      body.validation === ValidationStatus5S.REPROVADO &&
      (!body.correctiveAction || body.correctiveAction.trim().length === 0)
    ) {
      const err = new Error('Ação corretiva é obrigatória ao reprovar uma auditoria.')
      ;(err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 422
      throw err
    }

    // 4. Aplica a validação
    const updatedAudit = await prisma.audit5S.update({
      where: { id: auditId },
      data: {
        validation:       body.validation,
        correctiveAction: body.correctiveAction?.trim() ?? null,
        validatorUserId:  validatorId,
      },
      select: {
        id:              true,
        status:          true,
        validation:      true,
        correctiveAction: true,
        areaType:        true,
        description:     true,
        updatedAt:       true,
        worksite: {
          select: { id: true, name: true, code: true },
        },
        auditorEmployee: {
          select: { id: true, fullName: true, registration: true },
        },
        validatorUser: {
          select: { id: true, email: true, role: true },
        },
        photos: {
          select: { id: true, photoUrl: true },
        },
      },
    })

    return { audit: updatedAudit }
  },

  // ── GET /5s/reports ───────────────────────────────────────────────────────────
  /**
   * Lista auditorias 5S com filtros dinâmicos e paginação.
   * Inclui KPIs agregados para o dashboard de qualidade.
   *
   * Filtros disponíveis:
   *   - worksiteId  : obra específica
   *   - status      : CONFORME | NAO_CONFORME
   *   - validation  : AGUARDANDO_AVALIACAO | APROVADO | REPROVADO
   *   - dateFrom    : data inicial (createdAt >=)
   *   - dateTo      : data final (createdAt <=)
   *   - page/limit  : paginação offset
   */
  async listReports(query: ReportsQuery) {
    const { worksiteId, status, validation, dateFrom, dateTo, page, limit } = query
    const skip = (page - 1) * limit

    // Monta o filtro dinamicamente — apenas os parâmetros presentes são aplicados
    const where = {
      ...(worksiteId && { worksiteId }),
      ...(status     && { status }),
      ...(validation && { validation }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo   && { lte: dateTo }),
            },
          }
        : {}),
    }

    // Executa contagem e listagem em paralelo para performance
    const [total, data] = await prisma.$transaction([
      prisma.audit5S.count({ where }),
      prisma.audit5S.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id:              true,
          areaType:        true,
          status:          true,
          validation:      true,
          description:     true,
          correctiveAction: true,
          createdAt:       true,
          updatedAt:       true,
          worksite: {
            select: { id: true, name: true, code: true, city: true },
          },
          auditorEmployee: {
            select: { id: true, fullName: true, registration: true },
          },
          validatorUser: {
            select: { id: true, email: true, role: true },
          },
          // Apenas contagem de fotos no listagem (URLs completas no endpoint de detalhe)
          _count: { select: { photos: true } },
        },
      }),
    ])

    // ── KPIs para o painel do Setor de Qualidade ─────────────────────────────
    // groupBy não é suportado dentro de $transaction interativo do Prisma v5.
    // Executado separadamente — ainda é rápido pois usa o mesmo índice composto.
    const kpiCounts = await prisma.audit5S.groupBy({
      by: ['status', 'validation'],
      where,
      _count: { _all: true },
    })

    const kpis = {
      total,
      conforme:            kpiCounts.filter((g) => g.status === AuditStatus5S.CONFORME).reduce((s, g) => s + ((g._count as { _all: number })._all ?? 0), 0),
      naoConforme:         kpiCounts.filter((g) => g.status === AuditStatus5S.NAO_CONFORME).reduce((s, g) => s + ((g._count as { _all: number })._all ?? 0), 0),
      aguardandoAvaliacao: kpiCounts.filter((g) => g.validation === ValidationStatus5S.AGUARDANDO_AVALIACAO).reduce((s, g) => s + ((g._count as { _all: number })._all ?? 0), 0),
      aprovado:            kpiCounts.filter((g) => g.validation === ValidationStatus5S.APROVADO).reduce((s, g) => s + ((g._count as { _all: number })._all ?? 0), 0),
      reprovado:           kpiCounts.filter((g) => g.validation === ValidationStatus5S.REPROVADO).reduce((s, g) => s + ((g._count as { _all: number })._all ?? 0), 0),
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      kpis,
    }
  },
}
