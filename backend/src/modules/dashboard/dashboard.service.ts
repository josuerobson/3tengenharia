import { prisma } from '../../lib/prisma.js'

export const dashboardService = {
  async getSummary() {
    // 1. Geral / Colaboradores / Obras
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const activeWorksites = await prisma.worksite.count({ where: { isActive: true } })

    // 2. Veículos
    const totalVehicles = await prisma.vehicle.count({ where: { status: { not: 'INACTIVE' } } })
    const activeTrips = await prisma.vehicleTrip.count({ where: { arrivalDateTime: null } })
    const maintenanceVehicles = await prisma.vehicle.count({ where: { status: 'MAINTENANCE' } })

    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'ACTIVE' },
      select: {
        currentKm: true,
        maintenanceKmThreshold: true,
        maintenanceDayThreshold: true,
        lastMaintenanceKm: true,
        lastMaintenanceDate: true,
      }
    })

    let vehiclesWithAlert = 0
    const now = new Date()
    for (const v of vehicles) {
      let kmAlert = false
      let dayAlert = false

      if (v.maintenanceKmThreshold && v.lastMaintenanceKm !== null) {
        const kmSince = v.currentKm - v.lastMaintenanceKm
        if (kmSince >= v.maintenanceKmThreshold) {
          kmAlert = true
        }
      }

      if (v.maintenanceDayThreshold && v.lastMaintenanceDate !== null) {
        const msSince = now.getTime() - new Date(v.lastMaintenanceDate).getTime()
        const daysSince = Math.floor(msSince / (1000 * 60 * 60 * 24))
        if (daysSince >= v.maintenanceDayThreshold) {
          dayAlert = true
        }
      }

      if (kmAlert || dayAlert) {
        vehiclesWithAlert++
      }
    }

    // 3. Almoxarifado / Ferramentas
    const totalAssets = await prisma.asset.count({ where: { currentStatus: { not: 'WRITTEN_OFF' } } })
    const availableAssets = await prisma.asset.count({ where: { currentStatus: 'AVAILABLE' } })
    const loanedAssets = await prisma.asset.count({ where: { currentStatus: 'LOANED' } })
    const maintenanceAssets = await prisma.asset.count({ where: { currentStatus: 'MAINTENANCE' } })
    const activeLoans = await prisma.assetLoan.count({ where: { isReturned: false } })
    const openAssetMaintenances = await prisma.assetMaintenanceLog.count({
      where: { maintenanceStatus: { in: ['OPEN', 'IN_PROGRESS'] } }
    })

    // 4. Horas (Diário de Classe)
    const pendingTimeLogs = await prisma.timeLog.count({ where: { isValidated: false } })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const timeLogsLast7Days = await prisma.timeLog.findMany({
      where: {
        workDate: { gte: sevenDaysAgo },
      },
      select: {
        totalMinutesWorked: true,
      }
    })
    const totalMinutesWorkedLast7Days = timeLogsLast7Days.reduce((acc, log) => acc + (log.totalMinutesWorked ?? 0), 0)

    // 5. Módulo 5S (Qualidade)
    const totalAudits5S = await prisma.audit5S.count()
    const conformAudits5S = await prisma.audit5S.count({ where: { status: 'CONFORME' } })
    const pendingAudits5S = await prisma.audit5S.count({ where: { validation: 'AGUARDANDO_AVALIACAO' } })

    const conformityRate5S = totalAudits5S > 0
      ? Math.round((conformAudits5S / totalAudits5S) * 100)
      : 100

    return {
      general: {
        activeUsers,
        activeWorksites,
      },
      vehicles: {
        totalVehicles,
        activeTrips,
        maintenanceVehicles,
        vehiclesWithAlert,
        availableVehicles: Math.max(0, totalVehicles - activeTrips - maintenanceVehicles),
      },
      warehouse: {
        totalAssets,
        availableAssets,
        loanedAssets,
        maintenanceAssets,
        activeLoans,
        openAssetMaintenances,
      },
      timeLogs: {
        pendingTimeLogs,
        totalHoursLast7Days: Math.round(totalMinutesWorkedLast7Days / 60),
      },
      fiveS: {
        totalAudits5S,
        conformAudits5S,
        pendingAudits5S,
        conformityRate5S,
      }
    }
  }
}
