// src/modules/vehicles/vehicles.service.ts
// Regras de negócio do módulo de Veículos & Viagens.
// Toda lógica que envolve o banco vive aqui — controllers são thin wrappers.

import { prisma } from '../../lib/prisma.js'
import type {
  StartTripBody,
  EndTripBody,
  MaintenanceAlert,
} from './vehicles.schema.js'

// ── Erros de domínio tipados ──────────────────────────────────────────────────

export class VehicleNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Veículo não encontrado: ${id}`)
    this.name = 'VehicleNotFoundError'
  }
}

export class VehicleNotActiveError extends Error {
  readonly statusCode = 409
  constructor(status: string) {
    super(
      `Veículo indisponível para viagem. Status atual: ${status}. ` +
        'Apenas veículos ACTIVE podem iniciar viagens.',
    )
    this.name = 'VehicleNotActiveError'
  }
}

export class InitialKmBelowCurrentError extends Error {
  readonly statusCode = 422
  constructor(initialKm: number, currentKm: number) {
    super(
      `KM inicial inválido: ${initialKm} km é menor que o odômetro atual do veículo (${currentKm} km). ` +
        'O odômetro não pode retroceder.',
    )
    this.name = 'InitialKmBelowCurrentError'
  }
}

export class TripNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Viagem não encontrada: ${id}`)
    this.name = 'TripNotFoundError'
  }
}

export class TripAlreadyEndedError extends Error {
  readonly statusCode = 409
  constructor(id: string) {
    super(`Esta viagem (${id}) já foi encerrada e não pode ser modificada.`)
    this.name = 'TripAlreadyEndedError'
  }
}

export class FinalKmBelowInitialError extends Error {
  readonly statusCode = 422
  constructor(finalKm: number, initialKm: number) {
    super(
      `KM final (${finalKm} km) não pode ser menor que o KM inicial da viagem (${initialKm} km).`,
    )
    this.name = 'FinalKmBelowInitialError'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica se o veículo atingiu algum limiar de manutenção preventiva.
 * Retorna um MaintenanceAlert ou null se nenhum limiar foi atingido.
 */
function checkMaintenanceThresholds(
  vehicle: {
    id: string
    licensePlate: string
    currentKm: number
    maintenanceKmThreshold: number | null
    maintenanceDayThreshold: number | null
    lastMaintenanceKm: number | null
    lastMaintenanceDate: Date | null
  },
  newKm: number,
): MaintenanceAlert | null {
  let kmAlert = false
  let dayAlert = false
  let kmSince: number | undefined
  let daysSince: number | undefined

  // Verifica limiar por quilometragem
  if (vehicle.maintenanceKmThreshold !== null) {
    const baseKm = vehicle.lastMaintenanceKm ?? 0
    kmSince = newKm - baseKm
    if (kmSince >= vehicle.maintenanceKmThreshold) {
      kmAlert = true
    }
  }

  // Verifica limiar por tempo (dias)
  if (vehicle.maintenanceDayThreshold !== null && vehicle.lastMaintenanceDate) {
    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24
    daysSince = Math.floor(
      (now.getTime() - vehicle.lastMaintenanceDate.getTime()) / msPerDay,
    )
    if (daysSince >= vehicle.maintenanceDayThreshold) {
      dayAlert = true
    }
  }

  if (!kmAlert && !dayAlert) return null

  const type: MaintenanceAlert['type'] =
    kmAlert && dayAlert
      ? 'KM_AND_DAY'
      : kmAlert
        ? 'KM_THRESHOLD'
        : 'DAY_THRESHOLD'

  const parts: string[] = []
  if (kmAlert && kmSince !== undefined)
    parts.push(`${kmSince} km rodados desde a última manutenção`)
  if (dayAlert && daysSince !== undefined)
    parts.push(`${daysSince} dias sem manutenção`)

  return {
    type,
    vehicleId: vehicle.id,
    licensePlate: vehicle.licensePlate,
    message:
      `⚠️ Manutenção preventiva necessária para o veículo ${vehicle.licensePlate}. ` +
      parts.join(' | ') +
      '.',
    ...(kmSince !== undefined && { kmSinceLastMaintenance: kmSince }),
    ...(daysSince !== undefined && { daysSinceLastMaintenance: daysSince }),
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const vehiclesService = {
  // ── POST /vehicles/trips/start ─────────────────────────────────────────────
  async startTrip(
    body: StartTripBody,
    /** employeeId extraído do JWT (pode ser null se o usuário não tem employee) */
    jwtEmployeeId: string | null,
  ) {
    // 1. Busca o veículo e valida existência
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: body.vehicleId },
      select: {
        id: true,
        licensePlate: true,
        status: true,
        currentKm: true,
        maintenanceKmThreshold: true,
        maintenanceDayThreshold: true,
        lastMaintenanceKm: true,
        lastMaintenanceDate: true,
      },
    })

    if (!vehicle) throw new VehicleNotFoundError(body.vehicleId)

    // 2. Valida que o veículo está ACTIVE
    if (vehicle.status !== 'ACTIVE') {
      throw new VehicleNotActiveError(vehicle.status)
    }

    // 3. ⚙️ REGRA DE NEGÓCIO: initialKm não pode ser menor que currentKm
    if (body.initialKm < vehicle.currentKm) {
      throw new InitialKmBelowCurrentError(body.initialKm, vehicle.currentKm)
    }

    // 4. Determina o motorista (body tem precedência; fallback para o do JWT)
    const resolvedDriverId = body.driverEmployeeId ?? jwtEmployeeId ?? undefined

    // 5. Verifica se há alerta de manutenção ativo já no momento da saída
    //    (usando o initialKm como novo odômetro)
    const preExistingAlert = checkMaintenanceThresholds(vehicle, body.initialKm)
    const maintenanceAlertActive = preExistingAlert !== null

    // 6. Cria o registro da viagem
    const trip = await prisma.vehicleTrip.create({
      data: {
        vehicleId: body.vehicleId,
        driverEmployeeId: resolvedDriverId ?? null,
        origin: body.origin,
        destination: body.destination,
        purpose: body.purpose ?? null,
        departureDateTime: new Date(),
        initialKm: body.initialKm,
        maintenanceAlertActive,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, model: true } },
        driverEmployee: { select: { id: true, fullName: true, registration: true } },
      },
    })

    return { trip, maintenanceAlert: preExistingAlert }
  },

  // ── POST /vehicles/trips/:id/end ───────────────────────────────────────────
  async endTrip(tripId: string, body: EndTripBody) {
    // 1. Busca a viagem com os dados do veículo
    const trip = await prisma.vehicleTrip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            currentKm: true,
            status: true,
            maintenanceKmThreshold: true,
            maintenanceDayThreshold: true,
            lastMaintenanceKm: true,
            lastMaintenanceDate: true,
          },
        },
      },
    })

    if (!trip) throw new TripNotFoundError(tripId)

    // 2. Valida que a viagem ainda está aberta
    if (trip.arrivalDateTime !== null) {
      throw new TripAlreadyEndedError(tripId)
    }

    // 3. ⚙️ REGRA DE NEGÓCIO: finalKm deve ser >= initialKm
    if (body.finalKm < trip.initialKm) {
      throw new FinalKmBelowInitialError(body.finalKm, trip.initialKm)
    }

    // 4. ⚙️ REGRA DE NEGÓCIO: Calcula rodagem e verifica limiares de manutenção
    const distanceTraveled = body.finalKm - trip.initialKm
    const arrivalDateTime = body.arrivalDateTime ?? new Date()

    const alert = checkMaintenanceThresholds(trip.vehicle, body.finalKm)
    const needsMaintenance = alert !== null

    // 5. Executa em transação: atualiza viagem + veículo atomicamente
    const [updatedTrip] = await prisma.$transaction([
      // Encerra a viagem
      prisma.vehicleTrip.update({
        where: { id: tripId },
        data: {
          finalKm: body.finalKm,
          distanceTraveled,
          arrivalDateTime,
          notes: body.notes ?? null,
        },
        include: {
          vehicle: { select: { id: true, licensePlate: true, model: true } },
          driverEmployee: { select: { id: true, fullName: true } },
        },
      }),

      // Atualiza odômetro e status do veículo
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          currentKm: body.finalKm,
          // ⚙️ REGRA DE NEGÓCIO: muda para MAINTENANCE se limiar atingido
          ...(needsMaintenance && { status: 'MAINTENANCE' }),
        },
      }),
    ])

    return {
      trip: updatedTrip,
      distanceTraveled,
      // Alert presente apenas quando o limiar foi atingido nesta viagem
      maintenanceAlert: alert,
      vehicleStatusChanged: needsMaintenance ? 'MAINTENANCE' : null,
    }
  },
}
