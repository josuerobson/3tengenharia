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

export class VehicleAlreadyInTripError extends Error {
  readonly statusCode = 409
  constructor(licensePlate: string) {
    super(`O veículo com placa ${licensePlate} já possui uma viagem em andamento.`)
    this.name = 'VehicleAlreadyInTripError'
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

export class OnlySelfTripCreationAllowedError extends Error {
  readonly statusCode = 403
  constructor() {
    super('Usuários com perfil Colaborador só podem registrar viagens para si mesmos.')
    this.name = 'OnlySelfTripCreationAllowedError'
  }
}

export class VehiclePhotosRequiredError extends Error {
  readonly statusCode = 400
  constructor() {
    super(
      'A cada ciclo de 10 viagens, é obrigatório registrar 4 fotos do veículo (frente, trás, lado direito, lado esquerdo) antes de iniciar a nova viagem.'
    )
    this.name = 'VehiclePhotosRequiredError'
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
    userRole: string,
  ) {
    // ⚙️ REGRA DE NEGÓCIO: Colaboradores só podem criar viagem para si mesmos
    if (userRole === 'COLLABORATOR') {
      if (!jwtEmployeeId) {
        throw new OnlySelfTripCreationAllowedError()
      }
      if (body.driverEmployeeId && body.driverEmployeeId !== jwtEmployeeId) {
        throw new OnlySelfTripCreationAllowedError()
      }
    }

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
        maintenanceTypes: {
          where: { isActive: true },
        },
      },
    })

    if (!vehicle) throw new VehicleNotFoundError(body.vehicleId)

    // 2. Valida que o veículo está ACTIVE
    if (vehicle.status !== 'ACTIVE') {
      throw new VehicleNotActiveError(vehicle.status)
    }

    // ⚙️ REGRA DE NEGÓCIO: Veículo não pode ter viagem em andamento
    const activeTrip = await prisma.vehicleTrip.findFirst({
      where: {
        vehicleId: body.vehicleId,
        arrivalDateTime: null,
      },
    })
    if (activeTrip) {
      throw new VehicleAlreadyInTripError(vehicle.licensePlate)
    }

    // 3. ⚙️ REGRA DE NEGÓCIO: initialKm não pode ser menor que currentKm
    if (body.initialKm < vehicle.currentKm) {
      throw new InitialKmBelowCurrentError(body.initialKm, vehicle.currentKm)
    }

    // ⚙️ REGRA DE NEGÓCIO: A cada ciclo de 10 viagens, exige registro de 4 fotos antes de iniciar a 11ª
    const totalTrips = await prisma.vehicleTrip.count({
      where: { vehicleId: body.vehicleId },
    })
    const requiresPhotos = totalTrips > 0 && totalTrips % 10 === 0
    if (requiresPhotos) {
      if (
        !body.departurePhotoFront ||
        !body.departurePhotoBack ||
        !body.departurePhotoRight ||
        !body.departurePhotoLeft
      ) {
        throw new VehiclePhotosRequiredError()
      }
    }

    // 4. Determina o motorista (body tem precedência; fallback para o do JWT)
    const resolvedDriverId = body.driverEmployeeId ?? jwtEmployeeId ?? undefined

    // 5. Verifica se há alerta de manutenção ativo já no momento da saída
    //    (usando o initialKm como novo odômetro)
    const preExistingAlert = checkMaintenanceThresholds(vehicle, body.initialKm)
    
    // Também checa os tipos específicos de manutenção baseando-se no initialKm
    let hasCriticalMaintenanceTypeAlert = false
    const today = new Date()
    const urgencyOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, ok: 1 }
    
    for (const t of vehicle.maintenanceTypes ?? []) {
      if (!t.isActive) continue
      
      let kmUrgency = 'ok'
      if (t.intervalKm !== null) {
        const baseKm = t.lastServiceKm ?? 0
        const pct = Math.min(100, ((body.initialKm - baseKm) / t.intervalKm) * 100)
        if (pct >= 100) kmUrgency = 'critical'
        else if (pct >= 85) kmUrgency = 'high'
      }
      
      let daysUrgency = 'ok'
      if (t.intervalDays !== null) {
        const baseDate = t.lastServiceDate ? new Date(t.lastServiceDate) : new Date(0)
        const dueDateMs = baseDate.getTime() + t.intervalDays * 86_400_000
        const daysRemaining = Math.ceil((dueDateMs - today.getTime()) / 86_400_000)
        const elapsed = t.intervalDays - daysRemaining
        const pct = Math.min(100, (elapsed / t.intervalDays) * 100)
        if (pct >= 100) daysUrgency = 'critical'
        else if (pct >= 85) daysUrgency = 'high'
      }
      
      const candidates = [kmUrgency, daysUrgency]
      const urgency = candidates.sort((a, b) => {
        const valA = urgencyOrder[a] ?? 0
        const valB = urgencyOrder[b] ?? 0
        return valB - valA
      })[0] ?? 'ok'
      
      if (urgency === 'critical' || urgency === 'high') {
        hasCriticalMaintenanceTypeAlert = true
        break
      }
    }

    const maintenanceAlertActive = preExistingAlert !== null || hasCriticalMaintenanceTypeAlert

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
        departureGeolocation: body.departureGeolocation ?? null,
        worksiteId: body.worksiteId ?? null,
        departurePhotoFront: body.departurePhotoFront ?? null,
        departurePhotoBack: body.departurePhotoBack ?? null,
        departurePhotoRight: body.departurePhotoRight ?? null,
        departurePhotoLeft: body.departurePhotoLeft ?? null,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, model: true } },
        driverEmployee: { select: { id: true, fullName: true, registration: true } },
        worksite: { select: { id: true, code: true, name: true } },
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
            maintenanceTypes: {
              where: { isActive: true },
            },
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
    
    // Também checa os tipos específicos de manutenção baseando-se no finalKm
    let hasCriticalMaintenanceTypeAlert = false
    const today = new Date()
    const urgencyOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, ok: 1 }
    
    for (const t of trip.vehicle.maintenanceTypes ?? []) {
      if (!t.isActive) continue
      
      let kmUrgency = 'ok'
      if (t.intervalKm !== null) {
        const baseKm = t.lastServiceKm ?? 0
        const pct = Math.min(100, ((body.finalKm - baseKm) / t.intervalKm) * 100)
        if (pct >= 100) kmUrgency = 'critical'
        else if (pct >= 85) kmUrgency = 'high'
      }
      
      let daysUrgency = 'ok'
      if (t.intervalDays !== null) {
        const baseDate = t.lastServiceDate ? new Date(t.lastServiceDate) : new Date(0)
        const dueDateMs = baseDate.getTime() + t.intervalDays * 86_400_000
        const daysRemaining = Math.ceil((dueDateMs - today.getTime()) / 86_400_000)
        const elapsed = t.intervalDays - daysRemaining
        const pct = Math.min(100, (elapsed / t.intervalDays) * 100)
        if (pct >= 100) daysUrgency = 'critical'
        else if (pct >= 85) daysUrgency = 'high'
      }
      
      const candidates = [kmUrgency, daysUrgency]
      const urgency = candidates.sort((a, b) => {
        const valA = urgencyOrder[a] ?? 0
        const valB = urgencyOrder[b] ?? 0
        return valB - valA
      })[0] ?? 'ok'
      
      if (urgency === 'critical' || urgency === 'high') {
        hasCriticalMaintenanceTypeAlert = true
        break
      }
    }

    const needsMaintenance = alert !== null || hasCriticalMaintenanceTypeAlert

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
          arrivalGeolocation: body.arrivalGeolocation ?? null,
          arrivalOdometerPhoto: body.arrivalOdometerPhoto,
        },
        include: {
          vehicle: { select: { id: true, licensePlate: true, model: true } },
          driverEmployee: { select: { id: true, fullName: true } },
          worksite: { select: { id: true, code: true, name: true } },
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
      maintenanceAlert: alert,
      vehicleStatusChanged: needsMaintenance ? 'MAINTENANCE' : null,
    }
  },

  // ── GET /vehicles/trips ────────────────────────────────────────────────────
  async listTrips(opts?: { vehicleId?: string; limit?: number; offset?: number }) {
    const where = opts?.vehicleId ? { vehicleId: opts.vehicleId } : {}
    const [total, trips] = await prisma.$transaction([
      prisma.vehicleTrip.count({ where }),
      prisma.vehicleTrip.findMany({
        where,
        orderBy: { departureDateTime: 'desc' },
        take:  opts?.limit  ?? 100,
        skip:  opts?.offset ?? 0,
        select: {
          id:                    true,
          origin:                true,
          destination:           true,
          purpose:               true,
          departureDateTime:     true,
          arrivalDateTime:       true,
          initialKm:             true,
          finalKm:               true,
          distanceTraveled:      true,
          maintenanceAlertActive: true,
          notes:                 true,
          departureGeolocation:  true,
          arrivalGeolocation:    true,
          createdAt:             true,
          worksiteId:            true,
          worksite: {
            select: {
              id:   true,
              code: true,
              name: true,
            },
          },
          incidents: {
            select: {
              id:          true,
              description: true,
              location:    true,
              photos:      true,
              createdAt:   true,
            },
            orderBy: { createdAt: 'desc' },
          },
          vehicle: {
            select: {
              id:           true,
              licensePlate: true,
              brand:        true,
              model:        true,
              year:         true,
              currentKm:    true,
              status:       true,
            },
          },
          driverEmployee: {
            select: {
              id:           true,
              fullName:     true,
              registration: true,
            },
          },
        },
      }),
    ])
    return { trips, total }
  },

  async listAll() {
    return prisma.vehicle.findMany({
      orderBy: [{ status: 'asc' }, { brand: 'asc' }, { model: 'asc' }],
      select: {
        id: true, licensePlate: true, brand: true, model: true,
        year: true, color: true, fuelType: true, currentKm: true,
        status: true, maintenanceKmThreshold: true, maintenanceDayThreshold: true,
        lastMaintenanceKm: true, lastMaintenanceDate: true, notes: true,
        createdAt: true, updatedAt: true,
        trips: {
          where: { arrivalDateTime: null },
          select: { id: true },
        },
        _count: {
          select: { trips: true },
        },
      },
    })
  },


  async create(data: {
    licensePlate: string; brand: string; model: string; year: number; currentKm: number
    color?: string; fuelType?: string; notes?: string
    maintenanceKmThreshold?: number; maintenanceDayThreshold?: number
  }) {
    return prisma.vehicle.create({
      data: {
        licensePlate:            data.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        brand:                   data.brand,
        model:                   data.model,
        year:                    data.year,
        currentKm:               data.currentKm,
        color:                   data.color             ?? null,
        fuelType:                data.fuelType          ?? null,
        notes:                   data.notes             ?? null,
        maintenanceKmThreshold:  data.maintenanceKmThreshold  ?? null,
        maintenanceDayThreshold: data.maintenanceDayThreshold ?? null,
      },
    })
  },

  async findById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
    })
  },

  async update(id: string, data: {
    brand?: string; model?: string; year?: number; color?: string | null
    fuelType?: string | null; currentKm?: number; status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
    maintenanceKmThreshold?: number | null; maintenanceDayThreshold?: number | null; notes?: string | null
  }) {
    const exists = await prisma.vehicle.findUnique({ where: { id } })
    if (!exists) return null
    return prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.brand                   !== undefined ? { brand:                   data.brand }                   : {}),
        ...(data.model                   !== undefined ? { model:                   data.model }                   : {}),
        ...(data.year                    !== undefined ? { year:                    data.year }                    : {}),
        ...(data.color                   !== undefined ? { color:                   data.color }                   : {}),
        ...(data.fuelType                !== undefined ? { fuelType:                data.fuelType }                : {}),
        ...(data.currentKm               !== undefined ? { currentKm:               data.currentKm }               : {}),
        ...(data.status                  !== undefined ? { status:                  data.status }                  : {}),
        ...(data.maintenanceKmThreshold  !== undefined ? { maintenanceKmThreshold:  data.maintenanceKmThreshold }  : {}),
        ...(data.maintenanceDayThreshold !== undefined ? { maintenanceDayThreshold: data.maintenanceDayThreshold } : {}),
        ...(data.notes                   !== undefined ? { notes:                   data.notes }                   : {}),
      },
    })
  },

  async remove(id: string) {
    const exists = await prisma.vehicle.findUnique({ where: { id } })
    if (!exists) return false
    // Soft delete — muda status para INACTIVE preservando histórico de viagens
    await prisma.vehicle.update({ where: { id }, data: { status: 'INACTIVE' } })
    return true
  },

  async createIncident(tripId: string, body: { description: string; location: string; photos?: string[] | undefined }) {
    const trip = await prisma.vehicleTrip.findUnique({
      where: { id: tripId },
    })
    if (!trip) {
      throw new TripNotFoundError(tripId)
    }
    return prisma.tripIncident.create({
      data: {
        tripId,
        description: body.description,
        location: body.location,
        photos: body.photos ?? [],
      },
    })
  },
}
