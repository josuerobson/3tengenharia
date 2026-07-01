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
import type { BulkTimeLogBody, DuplicateEmployeeDetail, ListTimeLogsQuery, ValidateTimeLogBody, UpdateTimeLogBody } from './time-logs.schema.js'
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

export class TimeLogNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Lançamento de horas não encontrado: ${id}`)
    this.name = 'TimeLogNotFoundError'
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
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
  const hh = String(time.hours).padStart(2, '0')
  const mm = String(time.minutes).padStart(2, '0')
  const isoStr = `${workDateStr}T${hh}:${mm}:00-03:00`
  return new Date(isoStr)
}

function parseTime(timeStr: string) {
  const [hh, mm] = timeStr.split(':').map(Number)
  return { hours: hh!, minutes: mm!, totalMinutes: hh! * 60 + mm! }
}

function getTimeStringFromDate(d: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(d)
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

  async list(filters: ListTimeLogsQuery, currentUser: JwtPayload) {
    const isPrivileged =
      currentUser.role === UserRole.MANAGER ||
      currentUser.role === UserRole.ADMIN

    let allowedWorksiteId = filters.worksiteId

    if (!isPrivileged) {
      if (!currentUser.employeeId) {
        return []
      }
      const coordinator = await prisma.employee.findUnique({
        where: { id: currentUser.employeeId },
        select: { worksiteId: true },
      })
      if (!coordinator || coordinator.worksiteId === null) {
        return []
      }
      allowedWorksiteId = coordinator.worksiteId
    }

    const where: any = {}
    if (allowedWorksiteId) {
      where.worksiteId = allowedWorksiteId
    }
    
    if (filters.startDate || filters.endDate) {
      where.workDate = {}
      if (filters.startDate) {
        where.workDate.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.workDate.lte = new Date(filters.endDate)
      }
    }

    return prisma.timeLog.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            registration: true,
            position: true,
          },
        },
        worksite: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { workDate: 'desc' },
    })
  },

  async validate(id: string, body: ValidateTimeLogBody, currentUser: JwtPayload) {
    if (currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Somente gestores ou administradores podem validar lançamentos.')
    }

    const existing = await prisma.timeLog.findUnique({
      where: { id },
    })
    if (!existing) throw new TimeLogNotFoundError(id)

    return prisma.timeLog.update({
      where: { id },
      data: {
        isValidated: body.isValidated,
        validatedAt: body.isValidated ? new Date() : null,
        validatedByUserId: body.isValidated ? currentUser.sub : null,
      },
      include: {
        employee: {
          select: { id: true, fullName: true, registration: true, position: true },
        },
        worksite: {
          select: { id: true, code: true, name: true },
        },
      },
    })
  },

  async update(id: string, body: UpdateTimeLogBody, currentUser: JwtPayload) {
    const existing = await prisma.timeLog.findUnique({
      where: { id },
    })
    if (!existing) throw new TimeLogNotFoundError(id)

    // Permissões
    if (currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.ADMIN) {
      if (existing.isValidated) {
        throw new ForbiddenError('Não é possível alterar um lançamento já validado.')
      }
      if (existing.enteredByUserId !== currentUser.sub) {
        throw new ForbiddenError('Você não tem permissão para alterar este lançamento.')
      }
    }

    // Merge e cálculo de horários usando America/Sao_Paulo timezone
    const workDateStr = existing.workDate.toISOString().split('T')[0]!

    const clockInStr = body.clockIn !== undefined ? body.clockIn : (existing.clockIn ? getTimeStringFromDate(existing.clockIn) : '08:00')
    const clockOutStr = body.clockOut !== undefined ? body.clockOut : (existing.clockOut ? getTimeStringFromDate(existing.clockOut) : '17:00')
    const breakStartStr = body.breakStart !== undefined ? body.breakStart : (existing.breakStart ? getTimeStringFromDate(existing.breakStart) : null)
    const breakEndStr = body.breakEnd !== undefined ? body.breakEnd : (existing.breakEnd ? getTimeStringFromDate(existing.breakEnd) : null)

    const clockInParsed = parseTime(clockInStr)
    const clockOutParsed = parseTime(clockOutStr)
    const breakStartParsed = breakStartStr ? parseTime(breakStartStr) : undefined
    const breakEndParsed = breakEndStr ? parseTime(breakEndStr) : undefined

    const clockInDt = buildDateTime(workDateStr, clockInParsed)
    const clockOutDt = buildDateTime(workDateStr, clockOutParsed)
    const breakStartDt = breakStartStr ? buildDateTime(workDateStr, breakStartParsed!) : null
    const breakEndDt = breakEndStr ? buildDateTime(workDateStr, breakEndParsed!) : null

    const totalMinutesWorked = calcTotalMinutes(
      clockInParsed,
      clockOutParsed,
      breakStartParsed,
      breakEndParsed,
    )

    const updateData: any = {
      clockIn: clockInDt,
      clockOut: clockOutDt,
      breakStart: breakStartDt,
      breakEnd: breakEndDt,
      totalMinutesWorked,
    }

    if (body.shiftType !== undefined) updateData.shiftType = body.shiftType
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.isValidated !== undefined) {
      if (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN) {
        updateData.isValidated = body.isValidated
        updateData.validatedAt = body.isValidated ? new Date() : null
        updateData.validatedByUserId = body.isValidated ? currentUser.sub : null
      } else {
        throw new ForbiddenError('Somente gestores ou administradores podem alterar o status de validação.')
      }
    }

    return prisma.timeLog.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, fullName: true, registration: true, position: true },
        },
        worksite: {
          select: { id: true, code: true, name: true },
        },
      },
    })
  },

  async delete(id: string, currentUser: JwtPayload) {
    const existing = await prisma.timeLog.findUnique({
      where: { id },
    })
    if (!existing) throw new TimeLogNotFoundError(id)

    // Permissões
    if (currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.ADMIN) {
      if (existing.isValidated) {
        throw new ForbiddenError('Não é possível excluir um lançamento já validado.')
      }
      if (existing.enteredByUserId !== currentUser.sub) {
        throw new ForbiddenError('Você não tem permissão para excluir este lançamento.')
      }
    }

    await prisma.timeLog.delete({
      where: { id },
    })
  },
}
