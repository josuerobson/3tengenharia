// src/modules/vehicles/vehicles.schema.ts

import { z } from 'zod'

// ── Start Trip ────────────────────────────────────────────────────────────────

export const startTripBodySchema = z.object({
  vehicleId: z
    .string({ required_error: 'vehicleId é obrigatório.' })
    .cuid('ID do veículo inválido.'),

  /** Motorista físico. Se omitido, usa o employeeId do JWT (quando aplicável). */
  driverEmployeeId: z.string().cuid('ID do motorista inválido.').optional(),

  initialKm: z
    .number({ required_error: 'KM inicial é obrigatório.' })
    .int('KM inicial deve ser um número inteiro.')
    .nonnegative('KM inicial não pode ser negativo.'),

  origin: z
    .string({ required_error: 'Origem é obrigatória.' })
    .min(2, 'Origem deve ter pelo menos 2 caracteres.')
    .trim(),

  destination: z
    .string({ required_error: 'Destino é obrigatório.' })
    .min(2, 'Destino deve ter pelo menos 2 caracteres.')
    .trim(),

  purpose: z.string().trim().max(500).optional(),
})

export type StartTripBody = z.infer<typeof startTripBodySchema>

// ── End Trip ──────────────────────────────────────────────────────────────────

export const endTripParamsSchema = z.object({
  id: z.string().cuid('ID da viagem inválido.'),
})

export const endTripBodySchema = z.object({
  finalKm: z
    .number({ required_error: 'KM final é obrigatório.' })
    .int('KM final deve ser um número inteiro.')
    .nonnegative('KM final não pode ser negativo.'),

  /** Se omitida, usa o horário atual do servidor. */
  arrivalDateTime: z.coerce.date().optional(),

  notes: z.string().trim().max(1000).optional(),
})

export type EndTripParams = z.infer<typeof endTripParamsSchema>
export type EndTripBody = z.infer<typeof endTripBodySchema>

// ── Maintenance Alert (response shape) ───────────────────────────────────────

export interface MaintenanceAlert {
  type: 'KM_THRESHOLD' | 'DAY_THRESHOLD' | 'KM_AND_DAY'
  message: string
  vehicleId: string
  licensePlate: string
  kmSinceLastMaintenance?: number
  daysSinceLastMaintenance?: number
}
