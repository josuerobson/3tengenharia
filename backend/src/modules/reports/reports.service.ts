// src/modules/reports/reports.service.ts
// Agregações do módulo Relatórios. Cada método reaproveita os modelos Prisma
// já existentes (VehicleTrip, AssetLoanRequest, TimeLog) — nenhuma tabela nova.

import { prisma } from '../../lib/prisma.js'
import type {
  VehicleUtilizationQuery,
  AssetLoansQuery,
  WorkedHoursQuery,
} from './reports.schema.js'

function formatDuration(startISO: Date, endISO: Date | null): string | null {
  if (!endISO) return null
  const minutes = Math.round((endISO.getTime() - startISO.getTime()) / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export const reportsService = {
  // ── Relatórios > Controle de Veículos > Utilização de Veículos por Período ──
  async vehicleUtilization(query: VehicleUtilizationQuery) {
    const { vehicleId, worksiteId, dateFrom, dateTo } = query
    const where = {
      ...(vehicleId && { vehicleId }),
      ...(worksiteId && { worksiteId }),
      ...(dateFrom || dateTo
        ? {
            departureDateTime: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}),
    }

    const trips = await prisma.vehicleTrip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
        driverEmployee: { select: { id: true, fullName: true, registration: true } },
        worksite: { select: { id: true, code: true, name: true } },
        incidents: { select: { description: true } },
        fuelRecords: { select: { liters: true, totalAmount: true } },
      },
      orderBy: [{ vehicleId: 'asc' }, { departureDateTime: 'asc' }],
    })

    const lastFinalKmByVehicle = new Map<string, number>()

    return trips.map((trip) => {
      const previousFinalKm = lastFinalKmByVehicle.get(trip.vehicleId)
      const conforme = previousFinalKm === undefined || trip.initialKm === previousFinalKm
      if (trip.finalKm !== null) lastFinalKmByVehicle.set(trip.vehicleId, trip.finalKm)

      const hasIncident = trip.incidents.length > 0
      const hasFuel = trip.fuelRecords.length > 0

      return {
        id: trip.id,
        funcionario: trip.driverEmployee?.fullName ?? null,
        veiculo: `${trip.vehicle.brand} ${trip.vehicle.model}`,
        placa: trip.vehicle.licensePlate,
        worksite: trip.worksite ? `${trip.worksite.code} — ${trip.worksite.name}` : null,
        kmInicial: trip.initialKm,
        kmFinal: trip.finalKm,
        kmRodados: trip.distanceTraveled,
        origem: trip.origin,
        origemGeolocation: trip.departureGeolocation,
        destino: trip.destination,
        destinoGeolocation: trip.arrivalGeolocation,
        descViagem: trip.purpose,
        horarioSaida: trip.departureDateTime,
        horarioChegada: trip.arrivalDateTime,
        tempoTotal: formatDuration(trip.departureDateTime, trip.arrivalDateTime),
        sinistro: hasIncident ? 'S' : 'N',
        descSinistro: hasIncident ? trip.incidents.map((i) => i.description).join('; ') : null,
        abastecimento: hasFuel ? 'S' : 'N',
        descAbastecimento: hasFuel
          ? trip.fuelRecords.map((f) => `${f.liters}L / R$${f.totalAmount}`).join('; ')
          : null,
        conforme: conforme ? 'S' : 'N',
      }
    })
  },

  // ── Relatórios > Ferramentas e Equipamentos > Empréstimos Ativos e Pendentes ──
  async assetLoans(query: AssetLoansQuery) {
    const { worksiteId, status } = query
    const where = {
      status: status ?? { in: ['PENDING', 'LOANED'] as ('PENDING' | 'LOANED')[] },
      ...(worksiteId && { destinationWorksiteId: worksiteId }),
    }

    const requests = await prisma.assetLoanRequest.findMany({
      where,
      include: {
        requesterEmployee: { select: { id: true, fullName: true, registration: true } },
        category: { select: { id: true, name: true } },
        destinationWorksite: { select: { id: true, code: true, name: true, endDate: true } },
        allocatedAsset: { select: { assetTag: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const today = new Date()

    return requests.map((req) => {
      const expectedReturn = req.destinationWorksite?.endDate ?? null
      const isLate = Boolean(expectedReturn && req.status === 'LOANED' && today > expectedReturn)
      const diasEmAtraso = isLate
        ? Math.floor((today.getTime() - expectedReturn!.getTime()) / 86400000)
        : null

      return {
        id: req.id,
        dataEmprestimo: req.checkoutAt,
        funcionario: req.requesterEmployee.fullName,
        categoria: req.category.name,
        codigoPatrimonio: req.allocatedAsset?.assetTag ?? null,
        centroDeCusto: req.destinationWorksite
          ? `${req.destinationWorksite.code} — ${req.destinationWorksite.name}`
          : null,
        dataPrevistaDevolucao: expectedReturn,
        status: req.status === 'PENDING' ? 'Pendente' : isLate ? 'Atrasado' : 'Emprestado',
        diasEmAtraso,
      }
    })
  },

  // ── Relatórios > Rateio de Horas > Horas Trabalhadas ─────────────────────────
  async workedHours(query: WorkedHoursQuery) {
    const { worksiteId, employeeId, dateFrom, dateTo } = query
    const where = {
      ...(worksiteId && { worksiteId }),
      ...(employeeId && { employeeId }),
      ...(dateFrom || dateTo
        ? {
            workDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    }

    const logs = await prisma.timeLog.findMany({
      where,
      include: {
        employee: { select: { fullName: true, registration: true } },
        worksite: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ worksiteId: 'asc' }, { workDate: 'asc' }],
    })

    const rows = logs.map((log) => {
      const totalHoras = (log.totalMinutesWorked ?? 0) / 60
      return {
        id: log.id,
        centroDeCusto: `${log.worksite.code} — ${log.worksite.name}`,
        worksiteId: log.worksiteId,
        funcionario: log.employee.fullName,
        data: log.workDate,
        horarioChegada: log.clockIn,
        horarioSaida: log.clockOut,
        intervalo:
          log.breakStart && log.breakEnd ? formatDuration(log.breakStart, log.breakEnd) : null,
        totalHorasDia: Number(totalHoras.toFixed(2)),
        horasExtras: log.shiftType === 'OVERTIME' ? Number(totalHoras.toFixed(2)) : 0,
      }
    })

    // Resumo por obra: total de horas no período e média diária (dias com lançamento)
    const byWorksite = new Map<string, { label: string; totalMinutes: number; days: Set<string> }>()
    for (const log of logs) {
      const entry = byWorksite.get(log.worksiteId) ?? {
        label: `${log.worksite.code} — ${log.worksite.name}`,
        totalMinutes: 0,
        days: new Set<string>(),
      }
      entry.totalMinutes += log.totalMinutesWorked ?? 0
      entry.days.add(log.workDate.toISOString().slice(0, 10))
      byWorksite.set(log.worksiteId, entry)
    }

    const summary = Array.from(byWorksite.entries()).map(([worksiteId, entry]) => ({
      worksiteId,
      centroDeCusto: entry.label,
      totalHorasPeriodo: Number((entry.totalMinutes / 60).toFixed(2)),
      mediaDiaria: Number((entry.totalMinutes / 60 / entry.days.size).toFixed(2)),
    }))

    return { rows, summary }
  },
}
