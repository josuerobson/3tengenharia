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

  fullName: z
    .string({ required_error: 'Nome completo é obrigatório.' })
    .trim()
    .min(1, 'Nome completo não pode ser vazio.'),

  phone: z
    .string({ required_error: 'WhatsApp é obrigatório.' })
    .trim()
    .min(1, 'WhatsApp não pode ser vazio.'),

  cpf: z
    .string({ required_error: 'CPF é obrigatório.' })
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 11, 'CPF deve ter exatamente 11 dígitos.'),

  position: z
    .string({ required_error: 'Função é obrigatória.' })
    .trim()
    .min(1, 'Função não pode ser vazia.'),

  registration: z
    .string({ required_error: 'Matrícula é obrigatória.' })
    .trim()
    .min(1, 'Matrícula não pode ser vazia.'),

  isActive: z.boolean().optional().default(true),
  cnhExpirationDate: z.coerce.date().optional().nullable(),
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

  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  cpf: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 11, 'CPF deve ter exatamente 11 dígitos.')
    .optional(),
  position: z.string().trim().min(1).optional(),
  registration: z.string().trim().min(1).optional(),

  isActive: z.boolean().optional(),
  cnhExpirationDate: z.coerce.date().optional().nullable(),
})

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
