// src/modules/auth/auth.schema.ts
// Schemas Zod para validação dos bodies e respostas das rotas de autenticação.

import { z } from 'zod'
import { UserRole } from '@prisma/client'

// ── Request Bodies ─────────────────────────────────────────────────────────────

export const loginBodySchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório.' })
    .email('E-mail inválido.')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Senha é obrigatória.' })
    .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

export type LoginBody = z.infer<typeof loginBodySchema>

// ── Response Shapes ────────────────────────────────────────────────────────────

/** Dados públicos do usuário retornados pela API (sem passwordHash) */
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  createdAt: z.date(),

  // Dados do colaborador vinculado (opcional)
  employee: z
    .object({
      id: z.string(),
      fullName: z.string(),
      registration: z.string(),
      position: z.string(),
      cpf: z.string().optional(),
      worksiteId: z.string().nullable(),
      worksite: z
        .object({
          code: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
})

export type UserPublic = z.infer<typeof userPublicSchema>

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.string(),
  user: userPublicSchema,
})

export type LoginResponse = z.infer<typeof loginResponseSchema>

// ── Change Password Request ───────────────────────────────────────────────────

export const changePasswordBodySchema = z.object({
  currentPassword: z
    .string({ required_error: 'Senha atual é obrigatória.' })
    .min(1, 'Senha atual é obrigatória.'),
  newPassword: z
    .string({ required_error: 'Nova senha é obrigatória.' })
    .min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
})

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>

