// src/modules/reports/reports.schema.ts
// Validação Zod dos filtros de cada relatório do módulo Relatórios.

import { z } from 'zod'

export const vehicleUtilizationQuerySchema = z.object({
  vehicleId: z.string().cuid().optional(),
  worksiteId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type VehicleUtilizationQuery = z.infer<typeof vehicleUtilizationQuerySchema>

export const assetLoansQuerySchema = z.object({
  worksiteId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'LOANED']).optional(),
})

export type AssetLoansQuery = z.infer<typeof assetLoansQuerySchema>

export const workedHoursQuerySchema = z.object({
  worksiteId: z.string().cuid().optional(),
  employeeId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type WorkedHoursQuery = z.infer<typeof workedHoursQuerySchema>
