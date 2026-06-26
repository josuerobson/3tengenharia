// src/modules/assets/assets.schema.ts

import { z } from 'zod'

// ── Loan (empréstimo / saída de item) ─────────────────────────────────────────

export const createLoanBodySchema = z.object({
  assetId: z
    .string({ required_error: 'assetId é obrigatório.' })
    .cuid('ID do bem inválido.'),

  borrowerEmployeeId: z
    .string({ required_error: 'borrowerEmployeeId é obrigatório.' })
    .cuid('ID do colaborador inválido.'),

  destinationWorksiteId: z
    .string()
    .cuid('ID da obra de destino inválido.')
    .optional(),

  expectedReturnAt: z.coerce
    .date()
    .refine((d) => d > new Date(), {
      message: 'Previsão de retorno deve ser uma data futura.',
    })
    .optional(),

  checkoutNotes: z.string().trim().max(1000).optional(),
})

export type CreateLoanBody = z.infer<typeof createLoanBodySchema>

// ── Maintenance Log (chamado de avaria / defeito) ─────────────────────────────

export const createMaintenanceLogBodySchema = z.object({
  assetId: z
    .string({ required_error: 'assetId é obrigatório.' })
    .cuid('ID do bem inválido.'),

  issueDescription: z
    .string({ required_error: 'issueDescription é obrigatório.' })
    .min(10, 'Descreva o problema com pelo menos 10 caracteres.')
    .max(2000)
    .trim(),

  /** URL ou path relativo gerado pelo serviço de upload (S3, Firebase Storage, etc.) */
  defectPhotoUrl: z
    .string()
    .url('defectPhotoUrl deve ser uma URL válida.')
    .optional(),
})

export type CreateMaintenanceLogBody = z.infer<
  typeof createMaintenanceLogBodySchema
>

// ── Asset (criação de bem patrimonial) ──────────────────────────────────────────

export const createAssetBodySchema = z.object({
  assetTag: z
    .string({ required_error: 'Código Patrimonial é obrigatório.' })
    .trim()
    .min(1, 'Código Patrimonial não pode ser vazio.'),

  description: z
    .string({ required_error: 'Descrição é obrigatória.' })
    .trim()
    .min(1, 'Descrição não pode ser vazia.'),

  category: z
    .string({ required_error: 'Categoria é obrigatória.' })
    .trim()
    .min(1, 'Categoria não pode ser vazia.'),

  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  serialNumber: z.string().trim().nullable().optional(),
  acquisitionDate: z.coerce.date().nullable().optional(),
  acquisitionValue: z.coerce.number().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
})

export type CreateAssetBody = z.infer<typeof createAssetBodySchema>

