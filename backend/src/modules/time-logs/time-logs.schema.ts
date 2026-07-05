// src/modules/time-logs/time-logs.schema.ts

import { z } from 'zod'

// ── Helpers de validação de horário ──────────────────────────────────────────

/** Aceita "HH:mm" e converte para o número de minutos desde meia-noite */
const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm (ex: 08:30).')
  .transform((val) => {
    const [hh, mm] = val.split(':').map(Number)
    if (hh === undefined || mm === undefined || hh > 23 || mm > 59) {
      throw new Error(`Horário inválido: ${val}`)
    }
    return { hours: hh, minutes: mm, totalMinutes: hh * 60 + mm }
  })

export type ParsedTime = { hours: number; minutes: number; totalMinutes: number }

// ── Bulk Time Log ─────────────────────────────────────────────────────────────

export const bulkTimeLogBodySchema = z
  .object({
    /** IDs dos funcionários que tiveram horas lançadas neste dia */
    employeeIds: z
      .array(
        z.string().cuid('ID de funcionário inválido no array.'),
        { required_error: 'employeeIds é obrigatório.' },
      )
      .min(1, 'Ao menos um funcionário deve ser informado.')
      .max(100, 'Máximo de 100 funcionários por lote.'),

    worksiteId: z
      .string({ required_error: 'worksiteId é obrigatório.' })
      .cuid('ID da obra inválido.'),

    /** Data de referência no formato YYYY-MM-DD */
    workDate: z
      .string({ required_error: 'workDate é obrigatório.' })
      .date('workDate deve estar no formato YYYY-MM-DD.'),

    clockIn: timeStringSchema,
    clockOut: timeStringSchema,

    /** Início do intervalo (opcional — pode não haver almoço) */
    breakStart: timeStringSchema.optional(),

    /** Fim do intervalo (obrigatório se breakStart for informado) */
    breakEnd: timeStringSchema.optional(),

    shiftType: z
      .enum(['REGULAR', 'OVERTIME', 'ON_CALL', 'ABSENCE', 'VACATION', 'HOLIDAY'])
      .default('REGULAR'),

    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // clockOut deve ser após clockIn
    if (data.clockOut.totalMinutes <= data.clockIn.totalMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clockOut'],
        message: 'Horário de saída deve ser posterior ao horário de entrada.',
      })
    }

    // breakStart e breakEnd devem ser fornecidos em par
    if (
      (data.breakStart === undefined) !==
      (data.breakEnd === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['breakEnd'],
        message:
          'breakStart e breakEnd devem ser informados juntos (ambos ou nenhum).',
      })
    }

    // Valida que o intervalo está dentro da jornada
    if (data.breakStart && data.breakEnd) {
      if (data.breakStart.totalMinutes <= data.clockIn.totalMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['breakStart'],
          message: 'Início do intervalo deve ser após a entrada.',
        })
      }
      if (data.breakEnd.totalMinutes >= data.clockOut.totalMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['breakEnd'],
          message: 'Fim do intervalo deve ser antes da saída.',
        })
      }
      if (data.breakEnd.totalMinutes <= data.breakStart.totalMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['breakEnd'],
          message: 'Fim do intervalo deve ser após o início do intervalo.',
        })
      }
    }
  })

export type BulkTimeLogBody = z.infer<typeof bulkTimeLogBodySchema>

// ── Detalhes de funcionários duplicados (retornado no erro 409) ───────────────

export interface DuplicateEmployeeDetail {
  employeeId: string
  fullName: string
  registration: string
  conflictingWorksiteId: string
  conflictingWorksiteName: string
}

// ── Query List Time Logs ──────────────────────────────────────────────────────

export const listTimeLogsQuerySchema = z.object({
  worksiteId: z.string().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
})

export type ListTimeLogsQuery = z.infer<typeof listTimeLogsQuerySchema>

export const validateTimeLogBodySchema = z.object({
  isValidated: z.boolean({ required_error: 'isValidated é obrigatório.' }),
})

export type ValidateTimeLogBody = z.infer<typeof validateTimeLogBodySchema>

export const updateTimeLogBodySchema = z.object({
  clockIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm.')
    .optional(),
  clockOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm.')
    .optional(),
  breakStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm.')
    .optional()
    .nullable(),
  breakEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm.')
    .optional()
    .nullable(),
  shiftType: z
    .enum(['REGULAR', 'OVERTIME', 'ON_CALL', 'ABSENCE', 'VACATION', 'HOLIDAY'])
    .optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  isValidated: z.boolean().optional(),
})

export type UpdateTimeLogBody = z.infer<typeof updateTimeLogBodySchema>


