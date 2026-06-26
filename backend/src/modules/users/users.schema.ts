// src/modules/users/users.schema.ts
import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const createUserBodySchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório.' })
    .email('E-mail inválido.')
    .trim()
    .toLowerCase(),

  password: z
    .string({ required_error: 'Senha é obrigatória.' })
    .min(8, 'Senha deve ter pelo menos 8 caracteres.'),

  role: z.nativeEnum(UserRole, {
    required_error: 'Perfil é obrigatório.',
  }),

  employeeId: z.string().cuid('ID do colaborador inválido.').nullable().optional(),

  isActive: z.boolean().optional().default(true),
})

export type CreateUserBody = z.infer<typeof createUserBodySchema>

export const updateUserBodySchema = z.object({
  email: z
    .string()
    .email('E-mail inválido.')
    .trim()
    .toLowerCase()
    .optional(),

  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres.')
    .optional(),

  role: z.nativeEnum(UserRole).optional(),

  employeeId: z.string().cuid('ID do colaborador inválido.').nullable().optional(),

  isActive: z.boolean().optional(),
})

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
