// src/modules/vehicles/maintenanceTypes.schema.ts
import { z } from 'zod'

export const createMaintenanceTypeBodySchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório.' })
    .min(3, 'Nome deve ter ao menos 3 caracteres.')
    .max(120, 'Nome deve ter no máximo 120 caracteres.'),
  description:    z.string().max(500).optional(),
  intervalKm:     z.number().int().positive().optional().nullable(),
  intervalDays:   z.number().int().positive().optional().nullable(),
  // Primeiro registro: KM e data em que o serviço foi feito pela última vez
  lastServiceKm:  z.number().int().nonnegative().optional().nullable(),
  lastServiceDate: z.string().date().optional().nullable(), // formato YYYY-MM-DD
})

export const updateMaintenanceTypeBodySchema = z.object({
  name:            z.string().min(3).max(120).optional(),
  description:     z.string().max(500).optional().nullable(),
  intervalKm:      z.number().int().positive().optional().nullable(),
  intervalDays:    z.number().int().positive().optional().nullable(),
  isActive:        z.boolean().optional(),
  lastServiceKm:   z.number().int().nonnegative().optional().nullable(),
  lastServiceDate: z.string().date().optional().nullable(),
})

export type CreateMaintenanceTypeBody = z.infer<typeof createMaintenanceTypeBodySchema>
export type UpdateMaintenanceTypeBody = z.infer<typeof updateMaintenanceTypeBodySchema>
