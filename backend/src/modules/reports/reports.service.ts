// src/modules/reports/reports.service.ts
// Agregações do módulo Relatórios. Cada método reaproveita os modelos Prisma
// já existentes (VehicleTrip, AssetLoanRequest, TimeLog) — nenhuma tabela nova.

import { prisma } from '../../lib/prisma.js'
import type {
  VehicleUtilizationQuery,
  AssetLoansQuery,
  WorkedHoursQuery,
  VehicleMaintenanceQuery,
  VehicleMileageHistoryQuery,
  AssetUsageHistoryQuery,
  AssetInventoryQuery,
  AssetMaintenanceQuery,
  TimelogsMonthlySummaryQuery,
  FiveSEvolutionQuery,
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

  // ── Relatórios > Controle de Veículos > Manutenções Preventivas e Realizadas ──
  async vehicleMaintenance(query: VehicleMaintenanceQuery) {
    const { vehicleId } = query
    const types = await prisma.vehicleMaintenanceType.findMany({
      where: {
        isActive: true,
        ...(vehicleId && { vehicleId }),
        OR: [{ intervalKm: { not: null } }, { intervalDays: { not: null } }],
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, brand: true, model: true, currentKm: true } },
      },
      orderBy: { name: 'asc' },
    })

    const today = new Date()

    return types.map((t) => {
      // KM: status conforme os limiares do documento de especificação —
      // Em dia / Requer atenção (<=1000km restantes) / Crítico (passou da KM prevista).
      let kmPrevista: number | null = null
      let kmStatus: 'Em dia' | 'Requer atenção' | 'Crítico' | null = null
      if (t.intervalKm !== null) {
        const baseKm = t.lastServiceKm ?? 0
        kmPrevista = baseKm + t.intervalKm
        const kmRemaining = kmPrevista - t.vehicle.currentKm
        kmStatus = kmRemaining < 0 ? 'Crítico' : kmRemaining <= 1000 ? 'Requer atenção' : 'Em dia'
      }

      // Dias: mesma lógica adaptada — Crítico se venceu, Requer atenção se faltam <=30 dias.
      let dataPrevista: Date | null = null
      let dayStatus: 'Em dia' | 'Requer atenção' | 'Crítico' | null = null
      if (t.intervalDays !== null) {
        const baseDate = t.lastServiceDate ?? new Date(0)
        dataPrevista = new Date(baseDate.getTime() + t.intervalDays * 86400000)
        const daysRemaining = Math.ceil((dataPrevista.getTime() - today.getTime()) / 86400000)
        dayStatus = daysRemaining < 0 ? 'Crítico' : daysRemaining <= 30 ? 'Requer atenção' : 'Em dia'
      }

      const severityOrder = { Crítico: 0, 'Requer atenção': 1, 'Em dia': 2 }
      const status =
        [kmStatus, dayStatus]
          .filter((s): s is 'Em dia' | 'Requer atenção' | 'Crítico' => s !== null)
          .sort((a, b) => severityOrder[a] - severityOrder[b])[0] ?? 'Em dia'

      return {
        id: t.id,
        veiculo: `${t.vehicle.brand} ${t.vehicle.model}`,
        placa: t.vehicle.licensePlate,
        tipoManutencao: t.name,
        kmPrevista,
        kmAtual: t.vehicle.currentKm,
        status,
        dataUltima: t.lastServiceDate,
        dataPrevista,
        descManutencao: t.lastServiceNotes ?? t.description,
      }
    })
  },

  // ── Relatórios > Controle de Veículos > Histórico de Quilometragem por Veículo ──
  async vehicleMileageHistory(query: VehicleMileageHistoryQuery) {
    const { vehicleId, dateFrom, dateTo } = query
    const where = {
      ...(vehicleId && { vehicleId }),
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
      },
      orderBy: [{ vehicleId: 'asc' }, { departureDateTime: 'asc' }],
    })

    // Agrupa por veículo + dia
    const byVehicleDay = new Map<
      string,
      { vehicleId: string; veiculo: string; placa: string; date: string; kmInicial: number; kmFinal: number; kmTotalDia: number }
    >()
    for (const trip of trips) {
      const date = trip.departureDateTime.toISOString().slice(0, 10)
      const key = `${trip.vehicleId}_${date}`
      const entry = byVehicleDay.get(key) ?? {
        vehicleId: trip.vehicleId,
        veiculo: `${trip.vehicle.brand} ${trip.vehicle.model}`,
        placa: trip.vehicle.licensePlate,
        date,
        kmInicial: trip.initialKm,
        kmFinal: trip.finalKm ?? trip.initialKm,
        kmTotalDia: 0,
      }
      entry.kmInicial = Math.min(entry.kmInicial, trip.initialKm)
      entry.kmFinal = Math.max(entry.kmFinal, trip.finalKm ?? trip.initialKm)
      entry.kmTotalDia += trip.distanceTraveled ?? 0
      byVehicleDay.set(key, entry)
    }

    const grouped = Array.from(byVehicleDay.values()).sort((a, b) =>
      a.vehicleId === b.vehicleId ? a.date.localeCompare(b.date) : a.vehicleId.localeCompare(b.vehicleId),
    )

    const kmAcumuladoByVehicle = new Map<string, number>()
    const rows = grouped.map((g) => {
      const acumulado = (kmAcumuladoByVehicle.get(g.vehicleId) ?? 0) + g.kmTotalDia
      kmAcumuladoByVehicle.set(g.vehicleId, acumulado)
      return {
        id: `${g.vehicleId}_${g.date}`,
        veiculo: g.veiculo,
        placa: g.placa,
        data: g.date,
        kmInicial: g.kmInicial,
        kmFinal: g.kmFinal,
        kmTotalPeriodo: g.kmTotalDia,
        kmAcumulado: acumulado,
      }
    })

    // Resumo por veículo: média diária de uso
    const byVehicle = new Map<string, { veiculo: string; placa: string; totalKm: number; days: number }>()
    for (const row of rows) {
      const entry = byVehicle.get(row.veiculo + row.placa) ?? { veiculo: row.veiculo, placa: row.placa, totalKm: 0, days: 0 }
      entry.totalKm += row.kmTotalPeriodo
      entry.days += 1
      byVehicle.set(row.veiculo + row.placa, entry)
    }
    const summary = Array.from(byVehicle.values()).map((v) => ({
      veiculo: v.veiculo,
      placa: v.placa,
      mediaDiaria: Number((v.totalKm / v.days).toFixed(1)),
    }))

    return { rows, summary }
  },

  // ── Relatórios > Ferramentas e Equipamentos > Histórico de Uso por Ferramenta ──
  async assetUsageHistory(query: AssetUsageHistoryQuery) {
    const { assetId, dateFrom, dateTo } = query
    const requestDateFilter =
      dateFrom || dateTo
        ? {
            checkoutAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}

    const assets = await prisma.asset.findMany({
      where: { ...(assetId && { id: assetId }) },
      include: {
        category: { select: { name: true } },
        requests: {
          where: { status: { in: ['LOANED', 'RETURNING', 'RETURNED'] }, ...requestDateFilter },
          include: { requesterEmployee: { select: { fullName: true } } },
        },
        maintenanceLogs: true,
      },
      orderBy: { assetTag: 'asc' },
    })

    const today = new Date()

    return assets
      .filter((a) => assetId || a.requests.length > 0 || a.maintenanceLogs.length > 0)
      .map((a) => {
        const totalDays = a.requests.reduce((sum, r) => {
          if (!r.checkoutAt) return sum
          const end = r.returnedAt ?? today
          return sum + Math.max(0, Math.ceil((end.getTime() - r.checkoutAt.getTime()) / 86400000))
        }, 0)

        const usageByEmployee = new Map<string, number>()
        for (const r of a.requests) {
          const name = r.requesterEmployee.fullName
          usageByEmployee.set(name, (usageByEmployee.get(name) ?? 0) + 1)
        }
        const topUsers = Array.from(usageByEmployee.entries())
          .sort((x, y) => y[1] - x[1])
          .slice(0, 3)
          .map(([name, count]) => `${name} (${count}x)`)
          .join(', ')

        return {
          id: a.id,
          codigoPatrimonio: a.assetTag,
          categoria: a.category?.name ?? a.legacyCategory ?? '—',
          vezesEmprestado: a.requests.length,
          totalDiasEmUso: totalDays,
          funcionariosQueMaisUtilizaram: topUsers || '—',
          manutencoesRealizadas: a.maintenanceLogs.length,
          estadoAtual: a.currentStatus,
        }
      })
  },

  // ── Relatórios > Ferramentas e Equipamentos > Inventário de Ferramentas e Equipamentos ──
  async assetInventory(query: AssetInventoryQuery) {
    const { categoryId, status } = query
    const assets = await prisma.asset.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(status && { currentStatus: status }),
      },
      include: {
        category: { select: { name: true } },
        maintenanceLogs: { select: { reportedAt: true }, orderBy: { reportedAt: 'desc' }, take: 1 },
      },
      orderBy: { assetTag: 'asc' },
    })

    return assets.map((a) => ({
      id: a.id,
      codigoPatrimonio: a.assetTag,
      descricao: a.description,
      categoria: a.category?.name ?? a.legacyCategory ?? '—',
      marcaModelo: [a.brand, a.model].filter(Boolean).join(' / ') || '—',
      status: a.currentStatus,
      localizacao: a.location ?? '—',
      ultimaManutencao: a.maintenanceLogs[0]?.reportedAt ?? null,
    }))
  },

  // ── Relatórios > Ferramentas e Equipamentos > Manutenções de Ferramentas ────
  async assetMaintenance(query: AssetMaintenanceQuery) {
    const { assetId, categoryId, dateFrom, dateTo } = query
    const where = {
      ...(assetId && { assetId }),
      ...(categoryId && { asset: { categoryId } }),
      ...(dateFrom || dateTo
        ? {
            reportedAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}),
    }

    const logs = await prisma.assetMaintenanceLog.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, category: { select: { name: true } } } },
      },
      orderBy: { reportedAt: 'desc' },
    })

    const reporterIds = Array.from(new Set(logs.map((l) => l.reportedByUserId).filter((id): id is string => !!id)))
    const reporters = reporterIds.length
      ? await prisma.user.findMany({ where: { id: { in: reporterIds } }, select: { id: true, email: true } })
      : []
    const reporterEmailById = new Map(reporters.map((u) => [u.id, u.email]))

    return logs.map((log) => ({
      id: log.id,
      dataManutencao: log.reportedAt,
      categoriaPatrimonio: `${log.asset.category?.name ?? '—'} — ${log.asset.assetTag}`,
      descricaoManutencao: log.issueDescription,
      custo: log.repairCost ? Number(log.repairCost) : null,
      responsavelReparo: log.reportedByUserId ? reporterEmailById.get(log.reportedByUserId) ?? '—' : '—',
      status: log.maintenanceStatus === 'RESOLVED' || log.maintenanceStatus === 'WRITTEN_OFF' ? 'Concluído' : 'Pendente',
    }))
  },

  // ── Relatórios > Rateio de Horas > Resumo Mensal de Rateio de Horas ─────────
  async timelogsMonthlySummary(query: TimelogsMonthlySummaryQuery) {
    const { worksiteId, dateFrom, dateTo } = query
    const where = {
      ...(worksiteId && { worksiteId }),
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
      include: { worksite: { select: { id: true, code: true, name: true } } },
    })

    const byWorksiteMonth = new Map<string, { worksiteId: string; obra: string; mes: string; totalMinutes: number }>()
    for (const log of logs) {
      const mes = log.workDate.toISOString().slice(0, 7) // YYYY-MM
      const key = `${log.worksiteId}_${mes}`
      const entry = byWorksiteMonth.get(key) ?? {
        worksiteId: log.worksiteId,
        obra: `${log.worksite.code} — ${log.worksite.name}`,
        mes,
        totalMinutes: 0,
      }
      entry.totalMinutes += log.totalMinutesWorked ?? 0
      byWorksiteMonth.set(key, entry)
    }

    const rows = Array.from(byWorksiteMonth.values()).sort((a, b) =>
      a.worksiteId === b.worksiteId ? a.mes.localeCompare(b.mes) : a.obra.localeCompare(b.obra),
    )

    return rows.map((row, idx) => {
      const previous = rows
        .slice(0, idx)
        .reverse()
        .find((r) => r.worksiteId === row.worksiteId)
      const totalHoras = Number((row.totalMinutes / 60).toFixed(2))
      const previousHoras = previous ? Number((previous.totalMinutes / 60).toFixed(2)) : null
      return {
        id: `${row.worksiteId}_${row.mes}`,
        mes: row.mes,
        obra: row.obra,
        totalHoras,
        comparativoMesAnterior: previousHoras !== null ? Number((totalHoras - previousHoras).toFixed(2)) : null,
      }
    })
  },

  // ── Relatórios > 5S > Evolução 5S por Período ───────────────────────────────
  async fiveSEvolution(query: FiveSEvolutionQuery) {
    const { worksiteId, areaType, dateFrom, dateTo } = query
    const where = {
      ...(worksiteId && { worksiteId }),
      ...(areaType && { areaType }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
            },
          }
        : {}),
    }

    const audits = await prisma.audit5S.findMany({
      where,
      include: { worksite: { select: { id: true, code: true, name: true } } },
    })

    const byWorksiteMonth = new Map<
      string,
      { worksiteId: string; centroDeCusto: string; mes: string; total: number; conforme: number; naoConforme: number; correcoes: number }
    >()
    for (const audit of audits) {
      const mes = audit.createdAt.toISOString().slice(0, 7)
      const key = `${audit.worksiteId}_${mes}`
      const entry = byWorksiteMonth.get(key) ?? {
        worksiteId: audit.worksiteId,
        centroDeCusto: `${audit.worksite.code} — ${audit.worksite.name}`,
        mes,
        total: 0,
        conforme: 0,
        naoConforme: 0,
        correcoes: 0,
      }
      entry.total += 1
      if (audit.status === 'CONFORME') entry.conforme += 1
      else {
        entry.naoConforme += 1
        // "Correção realizada" = não conformidade cuja validação foi aprovada pela Qualidade
        if (audit.validation === 'APROVADO') entry.correcoes += 1
      }
      byWorksiteMonth.set(key, entry)
    }

    return Array.from(byWorksiteMonth.values())
      .sort((a, b) => (a.worksiteId === b.worksiteId ? a.mes.localeCompare(b.mes) : a.centroDeCusto.localeCompare(b.centroDeCusto)))
      .map((e) => ({
        id: `${e.worksiteId}_${e.mes}`,
        mes: e.mes,
        centroDeCusto: e.centroDeCusto,
        percentualConformidade: Number(((e.conforme / e.total) * 100).toFixed(1)),
        quantidadeNaoConformidades: e.naoConforme,
        quantidadeCorrecoes: e.correcoes,
      }))
  },
}
