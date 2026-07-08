// src/modules/assets/assets.schema.ts

import { z } from 'zod'

// ── Categories ──────────────────────────────────────────────────────────

export const createCategoryBodySchema = z.object({
  name: z
    .string({ required_error: 'Nome da categoria é obrigatório.' })
    .trim()
    .min(1, 'Nome da categoria não pode ser vazio.')
    .max(100),
})

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>

export const editCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

export type EditCategoryBody = z.infer<typeof editCategoryBodySchema>


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

  categoryId: z
    .string({ required_error: 'Categoria é obrigatória.' })
    .cuid('ID de categoria inválido.'),

  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  serialNumber: z.string().trim().nullable().optional(),
  acquisitionDate: z.coerce.date().nullable().optional(),
  acquisitionValue: z.coerce.number().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
})

export type CreateAssetBody = z.infer<typeof createAssetBodySchema>

// ── Return Loan (legado) ──────────────────────────────────────────────────────

export const returnLoanBodySchema = z.object({
  returnedAt: z.coerce.date().optional(),
  returnNotes: z.string().trim().max(1000).optional(),
  returnPhotoUrl: z.string().optional().nullable(),
})

export type ReturnLoanBody = z.infer<typeof returnLoanBodySchema>

export const resolveMaintenanceLogBodySchema = z.object({
  assetId: z
    .string({ required_error: 'assetId é obrigatório.' })
    .cuid('ID do bem inválido.'),

  resolutionNotes: z
    .string({ required_error: 'resolutionNotes é obrigatório.' })
    .min(5, 'Descreva a resolução com pelo menos 5 caracteres.')
    .max(2000)
    .trim(),

  repairCost: z.coerce
    .number({ required_error: 'repairCost é obrigatório.' })
    .min(0, 'Custo de reparo não pode ser negativo.'),

  action: z.enum(['RESOLVED', 'WRITTEN_OFF'], {
    required_error: 'Ação é obrigatória (RESOLVED ou WRITTEN_OFF).',
  }),
})

export type ResolveMaintenanceLogBody = z.infer<
  typeof resolveMaintenanceLogBodySchema
>

// ── Loan Requests (Novo Fluxo de Solicitações) ────────────────────────────────

export const createAssetLoanRequestBodySchema = z.object({
  categoryId: z
    .string({ required_error: 'Categoria é obrigatória.' })
    .cuid('ID de categoria inválido.'),
  destinationWorksiteId: z
    .string()
    .cuid('ID da obra de destino inválido.')
    .optional()
    .nullable(),
  requestNotes: z.string().trim().max(1000).optional().nullable(),
})

export type CreateAssetLoanRequestBody = z.infer<
  typeof createAssetLoanRequestBodySchema
>

export const allocateAssetLoanRequestBodySchema = z.object({
  allocatedAssetId: z
    .string({ required_error: 'Bem patrimonial a ser alocado é obrigatório.' })
    .cuid('ID do bem inválido.'),
  checkoutPhoto1: z.string().optional().nullable(),
  checkoutPhoto2: z.string().optional().nullable(),
  checkoutPhoto3: z.string().optional().nullable(),
  checkoutPhoto4: z.string().optional().nullable(),
  checkoutNotes: z.string().trim().max(1000).optional().nullable(),
})

export type AllocateAssetLoanRequestBody = z.infer<
  typeof allocateAssetLoanRequestBodySchema
>

export const returnAssetLoanRequestBodySchema = z.object({
  returnPhoto1: z
    .string({ required_error: 'Pelo menos uma foto de devolução é obrigatória.' })
    .trim()
    .min(1, 'Foto de devolução inválida.'),
  returnPhoto2: z.string().optional().nullable(),
  returnPhoto3: z.string().optional().nullable(),
  returnPhoto4: z.string().optional().nullable(),
  returnNotes: z.string().trim().max(1000).optional().nullable(),
  isWorking: z.boolean({ required_error: 'Checklist de funcionamento é obrigatório.' }),
  hasDamage: z.boolean({ required_error: 'Checklist de avarias é obrigatório.' }),
})

export type ReturnAssetLoanRequestBody = z.infer<
  typeof returnAssetLoanRequestBodySchema
>

export const validateReturnAssetLoanRequestBodySchema = z.object({
  validationNotes: z.string().trim().max(1000).optional().nullable(),
  validationStatus: z.enum(['OK', 'OK_WITH_DAMAGE', 'DEFECTIVE'], {
    required_error: 'Status de validação é obrigatório.',
  }),
})

export type ValidateReturnAssetLoanRequestBody = z.infer<
  typeof validateReturnAssetLoanRequestBodySchema
>
