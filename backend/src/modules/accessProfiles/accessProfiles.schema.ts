// src/modules/accessProfiles/accessProfiles.schema.ts

import { z } from 'zod'

const accessLevelEnum = z.enum(['NONE', 'READ_OWN', 'READ_ALL', 'WRITE_OWN', 'WRITE_ALL'])

export const permissionEntrySchema = z.object({
  pageKey: z.string(),
  level: accessLevelEnum,
})

export const createAccessProfileBodySchema = z.object({
  name: z
    .string({ required_error: 'Nome do perfil é obrigatório.' })
    .trim()
    .min(1, 'Nome do perfil não pode ser vazio.')
    .max(100),
  isAdminType: z.boolean().optional().default(false),
  permissions: z.array(permissionEntrySchema).optional().default([]),
})

export type CreateAccessProfileBody = z.infer<typeof createAccessProfileBodySchema>

export const editAccessProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isAdminType: z.boolean().optional(),
  permissions: z.array(permissionEntrySchema).optional(),
})

export type EditAccessProfileBody = z.infer<typeof editAccessProfileBodySchema>
