// src/modules/vehicles/maintenanceTypes.service.ts
// Usa o singleton prisma importado diretamente (mesmo padrão de vehicles.service.ts)

import { prisma } from '../../lib/prisma.js'
import type {
  CreateMaintenanceTypeBody,
  UpdateMaintenanceTypeBody,
} from './maintenanceTypes.schema.js'

type UrgencyLevel = 'ok' | 'medium' | 'high' | 'critical'

export const maintenanceTypesService = {
  // ── Listar todos os tipos de um veículo ─────────────────────────────────
  async listByVehicle(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) return { notFound: true as const }

    const types = await prisma.vehicleMaintenanceType.findMany({
      where:   { vehicleId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return { types }
  },

  // ── Criar novo tipo de manutenção ────────────────────────────────────────
  async create(vehicleId: string, data: CreateMaintenanceTypeBody) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) return { notFound: true as const }

    const type = await prisma.vehicleMaintenanceType.create({
      data: {
        vehicleId,
        name:            data.name,
        description:     data.description ?? null,
        intervalKm:      data.intervalKm   ?? null,
        intervalDays:    data.intervalDays ?? null,
        lastServiceKm:   data.lastServiceKm   ?? null,
        lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : null,
      },
    })

    return { type }
  },

  // ── Atualizar tipo ───────────────────────────────────────────────────────
  async update(id: string, vehicleId: string, data: UpdateMaintenanceTypeBody) {
    const existing = await prisma.vehicleMaintenanceType.findFirst({ where: { id, vehicleId } })
    if (!existing) return { notFound: true as const }

    const type = await prisma.vehicleMaintenanceType.update({
      where: { id },
      data: {
        ...(data.name            !== undefined ? { name:            data.name }            : {}),
        ...(data.description     !== undefined ? { description:     data.description }     : {}),
        ...(data.intervalKm      !== undefined ? { intervalKm:      data.intervalKm }      : {}),
        ...(data.intervalDays    !== undefined ? { intervalDays:    data.intervalDays }    : {}),
        ...(data.isActive        !== undefined ? { isActive:        data.isActive }        : {}),
        ...(data.lastServiceKm   !== undefined ? { lastServiceKm:   data.lastServiceKm }   : {}),
        ...(data.lastServiceDate !== undefined ? { lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : null } : {}),
      },
    })

    return { type }
  },

  // ── Remover tipo ─────────────────────────────────────────────────────────
  async remove(id: string, vehicleId: string) {
    const existing = await prisma.vehicleMaintenanceType.findFirst({ where: { id, vehicleId } })
    if (!existing) return { notFound: true as const }

    await prisma.vehicleMaintenanceType.delete({ where: { id } })
    return { ok: true as const }
  },

  // ── Registrar conclusão de serviço ───────────────────────────────────────
  async completeService(id: string, vehicleId: string, serviceKm: number, serviceDate?: string) {
    const existing = await prisma.vehicleMaintenanceType.findFirst({ where: { id, vehicleId } })
    if (!existing) return { notFound: true as const }

    const type = await prisma.vehicleMaintenanceType.update({
      where: { id },
      data: {
        lastServiceKm:   serviceKm,
        lastServiceDate: serviceDate ? new Date(serviceDate) : new Date(),
      },
    })

    return { type }
  },

  // ── Calcular alertas por tipo de serviço ─────────────────────────────────
  async getAlerts(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        maintenanceTypes: {
          where:   { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!vehicle) return { notFound: true as const }

    const today = new Date()
    const urgencyOrder: Record<UrgencyLevel, number> = { critical: 4, high: 3, medium: 2, ok: 1 }

    const alerts = vehicle.maintenanceTypes
      .filter(t => t.intervalKm !== null || t.intervalDays !== null)
      .map(t => {
        // ── KM ────────────────────────────────────────────────────────────
        let kmRemaining: number | null = null
        let kmUrgency: UrgencyLevel | null = null

        if (t.intervalKm !== null) {
          const baseKm = t.lastServiceKm ?? 0
          kmRemaining  = (baseKm + t.intervalKm) - vehicle.currentKm
          const pct    = Math.min(100, ((vehicle.currentKm - baseKm) / t.intervalKm) * 100)
          kmUrgency = pct >= 100 ? 'critical' : pct >= 85 ? 'high' : pct >= 65 ? 'medium' : 'ok'
        }

        // ── Dias ──────────────────────────────────────────────────────────
        let daysRemaining: number | null = null
        let daysUrgency: UrgencyLevel | null = null

        if (t.intervalDays !== null) {
          const baseDate   = t.lastServiceDate ? new Date(t.lastServiceDate) : new Date(0)
          const dueDateMs  = baseDate.getTime() + t.intervalDays * 86_400_000
          daysRemaining    = Math.ceil((dueDateMs - today.getTime()) / 86_400_000)
          const elapsed    = t.intervalDays - daysRemaining
          const pct        = Math.min(100, (elapsed / t.intervalDays) * 100)
          daysUrgency = pct >= 100 ? 'critical' : pct >= 85 ? 'high' : pct >= 65 ? 'medium' : 'ok'
        }

        // Urgência = a mais severa entre km e dias
        const candidates = [kmUrgency, daysUrgency].filter((u): u is UrgencyLevel => u !== null)
        const urgency: UrgencyLevel = candidates.sort((a, b) => urgencyOrder[b] - urgencyOrder[a])[0] ?? 'ok'

        return {
          maintenanceTypeId: t.id,
          name:              t.name,
          description:       t.description,
          vehicleId:         vehicle.id,
          licensePlate:      vehicle.licensePlate,
          vehicleBrand:      vehicle.brand,
          vehicleModel:      vehicle.model,
          currentKm:         vehicle.currentKm,
          lastServiceKm:     t.lastServiceKm,
          lastServiceDate:   t.lastServiceDate?.toISOString().split('T')[0] ?? null,
          intervalKm:        t.intervalKm,
          intervalDays:      t.intervalDays,
          kmRemaining,
          daysRemaining,
          urgency,
        }
      })
      .sort((a, b) => {
        const order: Record<UrgencyLevel, number> = { critical: 0, high: 1, medium: 2, ok: 3 }
        return order[a.urgency] - order[b.urgency]
      })

    return { alerts }
  },
}
