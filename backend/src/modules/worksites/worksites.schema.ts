// src/modules/worksites/worksites.schema.ts
import { z } from 'zod'

export const createWorksiteBodySchema = z.object({
  code: z
    .string({ required_error: 'Código é obrigatório.' })
    .trim()
    .min(1, 'Código não pode ser vazio.'),
  name: z
    .string({ required_error: 'Nome é obrigatório.' })
    .trim()
    .min(1, 'Nome não pode ser vazio.'),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().max(2).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

export type CreateWorksiteBody = z.infer<typeof createWorksiteBodySchema>

export const updateWorksiteBodySchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().max(2).nullable().optional(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

export type UpdateWorksiteBody = z.infer<typeof updateWorksiteBodySchema>
