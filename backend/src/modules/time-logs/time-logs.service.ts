// src/modules/time-logs/time-logs.service.ts
// Regras de negócio do módulo de Lançamento de Horas (Bulk).
//
// REGRA 1 — Isolamento por Obra (Tenant):
//   Colaboradores só podem lançar horas para a obra à qual estão vinculados.
//   MANAGER e ADMIN são isentos desta restrição.
//
// REGRA 2 — Detecção de Duplicatas:
//   Um funcionário não pode ter dois lançamentos para o mesmo dia,
//   independente de qual obra. O lote é rejeitado como um todo se houver conflitos.

import { prisma } from '../../lib/prisma.js'
import { UserRole } from '@prisma/client'
import type { BulkTimeLogBody, DuplicateEmployeeDetail } from './time-logs.schema.js'
import type { JwtPayload } from '../../types/fastify.js'

// ── Erros de domínio ──────────────────────────────────────────────────────────

export class WorksiteNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Obra não encontrada ou inativa: ${id}`)
    this.name = 'WorksiteNotFoundError'
  }
}

export class CoordinatorWorksiteMismatchError extends Error {
  readonly statusCode = 403
  constructor(coordinatorWorksiteId: string | null, targetWorksiteId: string) {
    super(
      `Acesso negado: seu vínculo de obra (${coordinatorWorksiteId ?? 'nenhum'}) ` +
        `não corresponde à obra solicitada (${targetWorksiteId}). ` +
        'Colaboradores só podem lançar horas para a sua própria obra.',
    )
    this.name = 'CoordinatorWorksiteMismatchError'
  }
}

export class EmployeeNotLinkedError extends Error {
  readonly statusCode = 403
  constructor() {
    super(
      'Seu usuário não está vinculado a nenhum colaborador. ' +
        'Somente Coordenadores com vínculo de funcionário podem lançar horas.',
    )
    this.name = 'EmployeeNotLinkedError'
  }
}

export class DuplicateTimeLogError extends Error {
  readonly statusCode = 409
  readonly duplicates: DuplicateEmployeeDetail[]

  constructor(duplicates: DuplicateEmployeeDetail[]) {
    const names = duplicates.map((d) => d.fullName).join(', ')
    super(
      `Lançamento rejeitado: ${duplicates.length} funcionário(s) já possuem ` +
        `horas registradas nesta data em outra obra — ${names}. ` +
        'Corrija os conflitos e reenvie o lote.',
    )
    this.name = 'DuplicateTimeLogError'
    this.duplicates = duplicates
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Combina uma data de referência (YYYY-MM-DD) com um horário parseado
 * em um objeto Date com horário local.
 */
function buildDateTime(
  workDateStr: string,
  time: { hours: number; minutes: number },
): Date {
  // workDateStr está no formato YYYY-MM-DD
  const [year, month, day] = workDateStr.split('-').map(Number)
  const dt = new Date(year!, month! - 1, day!)
  dt.setHours(time.hours, time.minutes, 0, 0)
  return dt
}

/**
 * Calcula o total de minutos trabalhados descontando o intervalo.
 * Retorna null se os dados de entrada/saída estiverem incompletos.
 */
function calcTotalMinutes(
  clockIn: { totalMinutes: number },
  clockOut: { totalMinutes: number },
  breakStart?: { totalMinutes: number },
  breakEnd?: { totalMinutes: number },
): number {
  const gross = clockOut.totalMinutes - clockIn.totalMinutes
  const breakDuration =
    breakStart && breakEnd
      ? breakEnd.totalMinutes - breakStart.totalMinutes
      : 0
  return Math.max(0, gross - breakDuration)
}

// ── Service ───────────────────────────────────────────────────────────────────

export const timeLogsService = {
  // ── POST /time-logs/bulk ───────────────────────────────────────────────────
  async createBulk(body: BulkTimeLogBody, currentUser: JwtPayload) {
    // ════════════════════════════════════════════════════════════════════════
    // ⚙️ REGRA 1 — Isolamento por Obra (Tenant Isolation)
    // ════════════════════════════════════════════════════════════════════════
    const isPrivileged =
      currentUser.role === UserRole.MANAGER ||
      currentUser.role === UserRole.ADMIN

    if (!isPrivileged) {
      // Colaborador deve ter vínculo com um Employee
      if (!currentUser.employeeId) {
        throw new EmployeeNotLinkedError()
      }

      // Busca o employeeId do usuário para verificar o worksiteId vinculado
      const coordinatorEmployee = await prisma.employee.findUnique({
        where: { id: currentUser.employeeId, isActive: true },
        select: { id: true, worksiteId: true, fullName: true },
      })

      if (!coordinatorEmployee || coordinatorEmployee.worksiteId === null) {
        throw new CoordinatorWorksiteMismatchError(null, body.worksiteId)
      }

      // O worksiteId do Coordenador deve corresponder ao worksiteId do lançamento
      if (coordinatorEmployee.worksiteId !== body.worksiteId) {
        throw new CoordinatorWorksiteMismatchError(
          coordinatorEmployee.worksiteId,
          body.worksiteId,
        )
      }
    }

    // Valida que a obra existe e está ativa
    const worksite = await prisma.worksite.findUnique({
      where: { id: body.worksiteId, isActive: true },
      select: { id: true, code: true, name: true },
    })

    if (!worksite) throw new WorksiteNotFoundError(body.worksiteId)

    // ════════════════════════════════════════════════════════════════════════
    // ⚙️ REGRA 2 — Detecção de Duplicatas (mesmo funcionário, mesmo dia)
    // ════════════════════════════════════════════════════════════════════════
    // Busca lançamentos existentes para os funcionários do lote nesta data
    const existingLogs = await prisma.timeLog.findMany({
      where: {
        employeeId: { in: body.employeeIds },
        workDate: new Date(body.workDate),
      },
      select: {
        employeeId: true,
        worksiteId: true,
        workDate: true,
        employee: {
          select: { id: true, fullName: true, registration: true },
        },
        worksite: {
          select: { id: true, name: true },
        },
      },
    })

    if (existingLogs.length > 0) {
      // Filtra apenas os que estão em OUTRA obra (colisão real)
      // Caso o mesmo lote seja enviado duas vezes para a mesma obra, o unique
      // constraint do banco barrerá, mas a mensagem seria confusa — tratamos aqui.
      const duplicates: DuplicateEmployeeDetail[] = existingLogs.map((log) => ({
        employeeId: log.employeeId,
        fullName: log.employee.fullName,
        registration: log.employee.registration,
        conflictingWorksiteId: log.worksiteId,
        conflictingWorksiteName: log.worksite.name,
      }))

      throw new DuplicateTimeLogError(duplicates)
    }

    // ════════════════════════════════════════════════════════════════════════
    // Persiste o lote em uma única transação
    // ════════════════════════════════════════════════════════════════════════
    const workDateObj = new Date(body.workDate)

    const clockInDt = buildDateTime(body.workDate, body.clockIn)
    const clockOutDt = buildDateTime(body.workDate, body.clockOut)
    const breakStartDt = body.breakStart
      ? buildDateTime(body.workDate, body.breakStart)
      : undefined
    const breakEndDt = body.breakEnd
      ? buildDateTime(body.workDate, body.breakEnd)
      : undefined

    const totalMinutesWorked = calcTotalMinutes(
      body.clockIn,
      body.clockOut,
      body.breakStart,
      body.breakEnd,
    )

    // createMany em vez de múltiplos creates individuais — uma única query INSERT
    await prisma.timeLog.createMany({
      data: body.employeeIds.map((employeeId) => ({
        employeeId,
        worksiteId: body.worksiteId,
        enteredByUserId: currentUser.sub,
        workDate: workDateObj,
        clockIn: clockInDt,
        clockOut: clockOutDt,
        breakStart: breakStartDt ?? null,
        breakEnd: breakEndDt ?? null,
        shiftType: body.shiftType,
        totalMinutesWorked,
        notes: body.notes ?? null,
        isValidated: false,
      })),
      // skipDuplicates: false — preferimos que o unique constraint levante erro
      // explícito em vez de silenciosamente ignorar duplicatas
    })

    return {
      worksiteId: worksite.id,
      worksiteName: worksite.name,
      workDate: body.workDate,
      employeeCount: body.employeeIds.length,
      shiftType: body.shiftType,
      clockIn: `${String(body.clockIn.hours).padStart(2, '0')}:${String(body.clockIn.minutes).padStart(2, '0')}`,
      clockOut: `${String(body.clockOut.hours).padStart(2, '0')}:${String(body.clockOut.minutes).padStart(2, '0')}`,
      totalMinutesWorked,
      totalHoursWorked: Number((totalMinutesWorked / 60).toFixed(2)),
    }
  },
}
