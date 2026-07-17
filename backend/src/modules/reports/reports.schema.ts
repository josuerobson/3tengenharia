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

export const vehicleMaintenanceQuerySchema = z.object({
  vehicleId: z.string().cuid().optional(),
})

export type VehicleMaintenanceQuery = z.infer<typeof vehicleMaintenanceQuerySchema>

export const vehicleMileageHistoryQuerySchema = z.object({
  vehicleId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type VehicleMileageHistoryQuery = z.infer<typeof vehicleMileageHistoryQuerySchema>

export const assetUsageHistoryQuerySchema = z.object({
  assetId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type AssetUsageHistoryQuery = z.infer<typeof assetUsageHistoryQuerySchema>

export const assetInventoryQuerySchema = z.object({
  categoryId: z.string().cuid().optional(),
  status: z.enum(['AVAILABLE', 'LOANED', 'MAINTENANCE', 'DAMAGED', 'WRITTEN_OFF', 'RETURNING']).optional(),
})

export type AssetInventoryQuery = z.infer<typeof assetInventoryQuerySchema>

export const assetMaintenanceQuerySchema = z.object({
  assetId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type AssetMaintenanceQuery = z.infer<typeof assetMaintenanceQuerySchema>

export const timelogsMonthlySummaryQuerySchema = z.object({
  worksiteId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type TimelogsMonthlySummaryQuery = z.infer<typeof timelogsMonthlySummaryQuerySchema>

export const fiveSEvolutionQuerySchema = z.object({
  worksiteId: z.string().cuid().optional(),
  areaType: z.string().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
})

export type FiveSEvolutionQuery = z.infer<typeof fiveSEvolutionQuerySchema>
