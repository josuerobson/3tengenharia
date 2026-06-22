// src/modules/vehicles/maintenanceTypes.service.ts
import type { PrismaClient } from '@prisma/client'
import type {
  CreateMaintenanceTypeBody,
  UpdateMaintenanceTypeBody,
} from './maintenanceTypes.schema.js'

export function maintenanceTypesService(prisma: PrismaClient) {
  return {
    // ── Listar todos os tipos de um veículo ─────────────────────────────────
    async listByVehicle(vehicleId: string) {
      // Garante que o veículo existe
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
      if (!vehicle) {
        return { notFound: true as const }
      }

      const types = await prisma.vehicleMaintenanceType.findMany({
        where:   { vehicleId },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      })

      return { types }
    },

    // ── Criar novo tipo de manutenção ────────────────────────────────────────
    async create(vehicleId: string, data: CreateMaintenanceTypeBody) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
      if (!vehicle) {
        return { notFound: true as const }
      }

      const type = await prisma.vehicleMaintenanceType.create({
        data: {
          vehicleId,
          name:         data.name,
          description:  data.description ?? null,
          intervalKm:   data.intervalKm   ?? null,
          intervalDays: data.intervalDays ?? null,
        },
      })

      return { type }
    },

    // ── Atualizar tipo ───────────────────────────────────────────────────────
    async update(id: string, vehicleId: string, data: UpdateMaintenanceTypeBody) {
      const existing = await prisma.vehicleMaintenanceType.findFirst({
        where: { id, vehicleId },
      })
      if (!existing) {
        return { notFound: true as const }
      }

      const type = await prisma.vehicleMaintenanceType.update({
        where: { id },
        data: {
          ...(data.name        !== undefined ? { name:         data.name }        : {}),
          ...(data.description !== undefined ? { description:  data.description } : {}),
          ...(data.intervalKm  !== undefined ? { intervalKm:   data.intervalKm }  : {}),
          ...(data.intervalDays !== undefined ? { intervalDays: data.intervalDays } : {}),
          ...(data.isActive    !== undefined ? { isActive:     data.isActive }    : {}),
        },
      })

      return { type }
    },

    // ── Remover tipo (delete permanente) ────────────────────────────────────
    async remove(id: string, vehicleId: string) {
      const existing = await prisma.vehicleMaintenanceType.findFirst({
        where: { id, vehicleId },
      })
      if (!existing) {
        return { notFound: true as const }
      }

      await prisma.vehicleMaintenanceType.delete({ where: { id } })
      return { ok: true as const }
    },
  }
}
