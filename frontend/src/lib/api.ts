// src/lib/api.ts
// Camada centralizada de chamadas HTTP ao backend.
// Usa o token JWT armazenado em localStorage pelo AuthContext.
// Base URL configurável via variável de ambiente VITE_API_URL.

import type { AuthUser } from '@/types/auth'
import type { Asset } from '@/data/mockData'

let rawUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'https://3tbackend.j4sistemas.com.br/api/v1'

if (rawUrl && !rawUrl.endsWith('/api/v1')) {
  rawUrl = `${rawUrl}/api/v1`
}

const BASE_URL = rawUrl

export function mapBackendUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role as any,
    name: user.employee?.fullName ?? (user.role === 'ADMIN' ? 'Administrador' : user.email.split('@')[0]),
    employeeId: user.employee?.id ?? null,
  }
}

function getToken(): string | null {
  return localStorage.getItem('3t:token')
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = getToken()

  // Se não houver token ou se for o token mock de desenvolvimento,
  // tenta obter um token válido através de login automático com o admin padrão.
  // Ignora o auto-login se a requisição for explicitamente para o endpoint de login.
  if (path !== '/auth/login' && (!token || token === 'dev-mock-token')) {
    try {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@3tengenharia.com.br',
          password: 'Admin@3T2024!',
        }),
      })
      if (loginRes.ok) {
        const data = await loginRes.json() as { accessToken?: string; user?: unknown }
        if (data.accessToken) {
          token = data.accessToken
          localStorage.setItem('3t:token', token)
          if (data.user) {
            const mapped = mapBackendUser(data.user)
            localStorage.setItem('3t:user', JSON.stringify(mapped))
          }
        }
      }
    } catch (err) {
      console.error('Falha no auto-login do admin:', err)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token && token !== 'dev-mock-token') {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const json = await res.json()
      message = json?.message ?? message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ── Tipos da API ──────────────────────────────────────────────────────────────

export interface ApiVehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  color: string | null
  fuelType: string | null
  currentKm: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  maintenanceKmThreshold: number | null
  maintenanceDayThreshold: number | null
  lastMaintenanceKm: number | null
  lastMaintenanceDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  trips?: { id: string }[]
  _count?: { trips: number }
}

export interface ApiTrip {
  id: string
  origin: string
  destination: string
  purpose: string | null
  departureDateTime: string
  arrivalDateTime: string | null
  initialKm: number
  finalKm: number | null
  distanceTraveled: number | null
  maintenanceAlertActive: boolean
  notes: string | null
  departureGeolocation: string | null
  arrivalGeolocation: string | null
  arrivalOdometerPhoto: string | null
  departurePhotoFront?: string | null
  departurePhotoBack?: string | null
  departurePhotoRight?: string | null
  departurePhotoLeft?: string | null
  createdAt: string
  vehicle: {
    id: string
    licensePlate: string
    brand: string
    model: string
    year: number
    currentKm: number
    status: string
  }
  driverEmployee: {
    id: string
    fullName: string
    registration: string
  } | null
  worksiteId: string | null
  worksite: {
    id: string
    code: string
    name: string
  } | null
  incidents: ApiTripIncident[]
}

export interface ApiTripIncident {
  id: string
  tripId: string
  description: string
  location: string
  photos: string[]
  createdAt: string
}

// ── Endpoints de Veículos ─────────────────────────────────────────────────────

export const vehiclesApi = {
  list(): Promise<{ vehicles: ApiVehicle[] }> {
    return request('/vehicles')
  },

  getById(id: string): Promise<ApiVehicle> {
    return request(`/vehicles/${id}`)
  },

  create(data: {
    licensePlate: string
    brand: string
    model: string
    year: number
    currentKm: number
    color?: string
    fuelType?: string
    notes?: string
    maintenanceKmThreshold?: number
    maintenanceDayThreshold?: number
  }): Promise<ApiVehicle> {
    return request('/vehicles', { method: 'POST', body: JSON.stringify(data) })
  },

  update(id: string, data: Partial<ApiVehicle>): Promise<ApiVehicle> {
    return request(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  delete(id: string): Promise<void> {
    return request(`/vehicles/${id}`, { method: 'DELETE' })
  },
}

// ── Endpoints de Viagens ──────────────────────────────────────────────────────

export const tripsApi = {
  list(opts?: { vehicleId?: string; limit?: number; offset?: number }): Promise<{ trips: ApiTrip[]; total: number }> {
    const params = new URLSearchParams()
    if (opts?.vehicleId) params.set('vehicleId', opts.vehicleId)
    if (opts?.limit)     params.set('limit', String(opts.limit))
    if (opts?.offset)    params.set('offset', String(opts.offset))
    const qs = params.toString()
    return request(`/vehicles/trips${qs ? `?${qs}` : ''}`)
  },

  start(data: {
    vehicleId: string
    initialKm: number
    origin: string
    destination: string
    purpose?: string
    driverEmployeeId?: string
    departureGeolocation?: string
    worksiteId?: string
    departurePhotoFront?: string
    departurePhotoBack?: string
    departurePhotoRight?: string
    departurePhotoLeft?: string
  }): Promise<{ message: string; trip: ApiTrip; maintenanceAlert?: unknown }> {
    return request('/vehicles/trips/start', { method: 'POST', body: JSON.stringify(data) })
  },

  end(tripId: string, data: {
    finalKm: number
    arrivalDateTime?: string
    notes?: string
    arrivalGeolocation?: string
    arrivalOdometerPhoto: string
  }): Promise<{ message: string; trip: ApiTrip; distanceTraveled: number }> {
    return request(`/vehicles/trips/${tripId}/end`, { method: 'POST', body: JSON.stringify(data) })
  },

  createIncident(tripId: string, data: {
    description: string
    location: string
    photos?: string[]
  }): Promise<{ message: string; incident: ApiTripIncident }> {
    return request(`/vehicles/trips/${tripId}/incidents`, { method: 'POST', body: JSON.stringify(data) })
  },
}

// ── Endpoints de Autenticação ──────────────────────────────────────────────────

export const authApi = {
  async login(data: { email: string; password: string }): Promise<{
    accessToken: string
    tokenType: 'Bearer'
    expiresIn: string
    user: AuthUser
  }> {
    const res = await request<{
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: string
      user: any
    }>('/auth/login', { method: 'POST', body: JSON.stringify(data) })

    const mappedUser = mapBackendUser(res.user)
    return {
      ...res,
      user: mappedUser,
    }
  },

  me(): Promise<{ user: ApiUser }> {
    return request('/auth/me')
  },

  changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return request('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

// ── Endpoints de Manutenção ───────────────────────────────────────────────────

export interface ApiMaintenanceAlert {
  maintenanceTypeId: string
  name: string
  description: string | null
  vehicleId: string
  licensePlate: string
  vehicleBrand: string
  vehicleModel: string
  currentKm: number
  lastServiceKm: number | null
  lastServiceDate: string | null
  lastServiceProvider?: string | null
  lastServiceWarranty?: string | null
  lastServiceCost?: number | null
  lastServiceNotes?: string | null
  intervalKm: number | null
  intervalDays: number | null
  kmRemaining: number | null
  daysRemaining: number | null
  urgency: 'critical' | 'high' | 'medium' | 'ok'
}

export interface ApiMaintenanceType {
  id: string
  name: string
  description: string | null
  isActive: boolean
  intervalKm: number | null
  intervalDays: number | null
  lastServiceKm: number | null
  lastServiceDate: string | null
  createdAt?: string
  updatedAt?: string
}

export const maintenanceApi = {
  getAlerts(vehicleId: string): Promise<{ alerts: ApiMaintenanceAlert[] }> {
    return request(`/vehicles/${vehicleId}/alerts`)
  },

  completeService(
    vehicleId: string,
    maintenanceTypeId: string,
    data: {
      serviceKm: number
      serviceDate?: string
      serviceProvider?: string | null
      serviceWarranty?: string | null
      serviceCost?: number | null
      serviceNotes?: string | null
    }
  ): Promise<unknown> {
    return request(`/vehicles/${vehicleId}/maintenance-types/${maintenanceTypeId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async listAllAlerts(): Promise<ApiMaintenanceAlert[]> {
    const { vehicles } = await vehiclesApi.list()
    const allResults = await Promise.all(
      vehicles.map(v =>
        request<{ alerts: ApiMaintenanceAlert[] }>(`/vehicles/${v.id}/alerts`).catch(() => ({ alerts: [] }))
      )
    )
    return allResults.flatMap(r => r.alerts)
  },

  listTypes(vehicleId: string): Promise<{ types: ApiMaintenanceType[] }> {
    return request(`/vehicles/${vehicleId}/maintenance-types`)
  },

  createType(
    vehicleId: string,
    data: {
      name: string
      description?: string | null
      intervalKm?: number | null
      intervalDays?: number | null
      lastServiceKm?: number | null
      lastServiceDate?: string | null
    }
  ): Promise<ApiMaintenanceType> {
    return request(`/vehicles/${vehicleId}/maintenance-types`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateType(
    vehicleId: string,
    id: string,
    data: Partial<{
      name: string
      description: string | null
      intervalKm: number | null
      intervalDays: number | null
      lastServiceKm: number | null
      lastServiceDate: string | null
      isActive: boolean
    }>
  ): Promise<ApiMaintenanceType> {
    return request(`/vehicles/${vehicleId}/maintenance-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  deleteType(vehicleId: string, id: string): Promise<void> {
    return request(`/vehicles/${vehicleId}/maintenance-types/${id}`, {
      method: 'DELETE',
    })
  },
}

// ── Endpoints de Patrimônio (Assets) ──────────────────────────────────────────

export const assetsApi = {
  list(): Promise<Asset[]> {
    return request('/assets')
  },

  create(data: {
    assetTag: string
    description: string
    category: string
    brand?: string | null
    model?: string | null
    serialNumber?: string | null
    acquisitionDate?: string | null
    acquisitionValue?: number | null
    location?: string | null
    notes?: string | null
    photoUrl?: string | null
  }): Promise<Asset> {
    return request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  reportDefect(data: {
    assetId: string
    issueDescription: string
    defectPhotoUrl?: string
  }): Promise<{ message: string; maintenanceLog: any }> {
    return request('/assets/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  resolveMaintenance(data: {
    assetId: string
    resolutionNotes: string
    repairCost: number
    action: 'RESOLVED' | 'WRITTEN_OFF'
  }): Promise<{ message: string; maintenanceLog: any }> {
    return request('/assets/maintenance/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  listEmployees(): Promise<ApiEmployee[]> {
    return request('/assets/employees')
  },

  listWorksites(): Promise<ApiWorksite[]> {
    return request('/assets/worksites')
  },

  createLoan(data: {
    assetId: string
    borrowerEmployeeId: string
    destinationWorksiteId?: string | null
    expectedReturnAt?: string | null
    checkoutNotes?: string | null
  }): Promise<{ message: string; loan: any }> {
    return request('/assets/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  returnLoan(loanId: string, data: {
    returnedAt?: string | null
    returnNotes?: string | null
    returnPhotoUrl?: string | null
  }): Promise<{ message: string; loan: any }> {
    return request(`/assets/loans/${loanId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export interface ApiEmployee {
  id: string
  fullName: string
  registration: string
  position: string
  cnhExpirationDate?: string | null
}

export interface ApiWorksite {
  id: string
  code: string
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
}

export interface ApiUser {
  id: string
  email: string
  role: 'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'
  isActive: boolean
  createdAt: string
  employee?: {
    id: string
    fullName: string
    registration: string
    position: string
    phone?: string | null
    cpf?: string
    cnhExpirationDate?: string | null
    worksite?: {
      code: string
      name: string
    } | null
  } | null
}

// ── Endpoints de Usuários (Users) ─────────────────────────────────────────────

export const usersApi = {
  list(): Promise<ApiUser[]> {
    return request('/users')
  },

  create(data: {
    email: string
    password?: string
    role: 'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'
    fullName: string
    phone: string
    cpf: string
    position: string
    registration: string
    isActive: boolean
    cnhExpirationDate?: string | null
  }): Promise<ApiUser> {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(
    id: string,
    data: Partial<{
      email: string
      password?: string
      role: 'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'
      fullName: string
      phone: string
      cpf: string
      position: string
      registration: string
      isActive: boolean
      cnhExpirationDate?: string | null
    }>,
  ): Promise<ApiUser> {
    return request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete(id: string): Promise<void> {
    return request(`/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// ── Endpoints de Obras (Worksites) ───────────────────────────────────────────

export const worksitesApi = {
  list(): Promise<ApiWorksite[]> {
    return request('/worksites')
  },

  create(data: {
    code: string
    name: string
    address?: string | null
    city?: string | null
    state?: string | null
    isActive: boolean
    startDate?: string | null
    endDate?: string | null
  }): Promise<ApiWorksite> {
    return request('/worksites', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(
    id: string,
    data: Partial<{
      code: string
      name: string
      address?: string | null
      city?: string | null
      state?: string | null
      isActive: boolean
      startDate?: string | null
      endDate?: string | null
    }>,
  ): Promise<ApiWorksite> {
    return request(`/worksites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete(id: string): Promise<void> {
    return request(`/worksites/${id}`, {
      method: 'DELETE',
    })
  },
}

// ── Endpoints de Lançamentos de Horas (Time Logs) ────────────────────────────

export interface ApiTimeLog {
  id: string
  employeeId: string
  worksiteId: string
  workDate: string
  clockIn: string
  clockOut: string
  breakStart?: string | null
  breakEnd?: string | null
  shiftType: 'REGULAR' | 'OVERTIME' | 'ON_CALL' | 'ABSENCE' | 'VACATION' | 'HOLIDAY'
  totalMinutesWorked: number
  notes?: string | null
  isValidated: boolean
  enteredByUserId?: string | null
  employee: {
    fullName: string
    registration: string
    position: string
  }
  worksite: {
    code: string
    name: string
  }
}

export interface ApiBulkTimeLogParams {
  employeeIds: string[]
  worksiteId: string
  workDate: string // YYYY-MM-DD
  clockIn: string // HH:mm
  clockOut: string // HH:mm
  breakStart?: string | null
  breakEnd?: string | null
  shiftType?: 'REGULAR' | 'OVERTIME' | 'ON_CALL' | 'ABSENCE' | 'VACATION' | 'HOLIDAY'
  notes?: string | null
}

export interface ApiBulkTimeLogResponse {
  message: string
  summary: {
    worksiteId: string
    worksiteName: string
    workDate: string
    employeeCount: number
    shiftType: string
    clockIn: string
    clockOut: string
    totalMinutesWorked: number
    totalHoursWorked: number
  }
}

export interface ApiAllocationWorksite {
  id: string
  code: string
  name: string
}

export interface ApiAllocationManager {
  id: string
  email: string
  employee?: {
    fullName: string
  } | null
}

export interface ApiAllocationEmployee {
  id: string
  fullName: string
  registration: string
  position: string
  worksiteId?: string | null
  managerId?: string | null
  worksite?: {
    id: string
    name: string
  } | null
  manager?: {
    id: string
    email: string
    employee?: {
      fullName: string
    } | null
  } | null
}

export interface ApiTeamAllocationData {
  worksites: ApiAllocationWorksite[]
  managers: ApiAllocationManager[]
  employees: ApiAllocationEmployee[]
}

export const timeLogsApi = {
  list(filters: {
    worksiteId?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<ApiTimeLog[]> {
    const params = new URLSearchParams()
    if (filters.worksiteId) params.append('worksiteId', filters.worksiteId)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const queryStr = params.toString()
    return request(`/time-logs${queryStr ? `?${queryStr}` : ''}`)
  },

  createBulk(data: ApiBulkTimeLogParams): Promise<ApiBulkTimeLogResponse> {
    return request('/time-logs/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  validate(
    id: string,
    data: { isValidated: boolean },
  ): Promise<{ message: string; timeLog: ApiTimeLog }> {
    return request(`/time-logs/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  update(
    id: string,
    data: Partial<{
      clockIn: string
      clockOut: string
      breakStart: string | null
      breakEnd: string | null
      shiftType: string
      notes: string | null
      isValidated: boolean
    }>,
  ): Promise<{ message: string; timeLog: ApiTimeLog }> {
    return request(`/time-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete(id: string): Promise<void> {
    return request(`/time-logs/${id}`, {
      method: 'DELETE',
    })
  },

  getTeamAllocationData(): Promise<ApiTeamAllocationData> {
    return request('/time-logs/team-allocation')
  },

  saveTeamAllocation(data: {
    worksiteId: string
    managerId: string
    employeeIds: string[]
  }): Promise<{ success: boolean }> {
    return request('/time-logs/team-allocation', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export interface ApiAudit5S {
  id: string
  worksiteId: string
  worksite: {
    id: string
    code: string
    name: string
    city: string
  }
  areaType: string
  status: 'CONFORME' | 'NAO_CONFORME'
  description?: string | null
  photos: {
    id: string
    photoUrl: string
    createdAt: string
  }[]
  auditorEmployeeId: string
  auditorEmployee: {
    id: string
    fullName: string
    registration: string
  }
  validation: 'AGUARDANDO_AVALIACAO' | 'APROVADO' | 'REPROVADO'
  correctiveAction?: string | null
  validatedByUserId?: string | null
  validatorUser?: {
    id: string
    email: string
  } | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
}

export const fiveSApi = {
  list(params?: {
    worksiteId?: string
    status?: string
    validation?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }): Promise<{ audits: ApiAudit5S[]; total: number; pages: number }> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.set(k, String(v))
        }
      })
    }
    const qStr = query.toString()
    return request(`/5s/reports${qStr ? `?${qStr}` : ''}`).then((res: any) => ({
      audits: res.data || [],
      total: res.pagination?.total ?? 0,
      pages: res.pagination?.totalPages ?? 1,
    }))
  },

  create(data: {
    worksiteId: string
    areaType: string
    status: 'CONFORME' | 'NAO_CONFORME'
    description?: string
    photoUrls: string[]
  }): Promise<{ message: string; audit: ApiAudit5S }> {
    return request('/5s/audits', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  validate(
    auditId: string,
    data: {
      validation: 'APROVADO' | 'REPROVADO'
      correctiveAction?: string
    },
  ): Promise<{ message: string; audit: ApiAudit5S }> {
    return request(`/5s/audits/${auditId}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

export interface DashboardSummary {
  general: {
    activeUsers: number
    activeWorksites: number
  }
  vehicles: {
    totalVehicles: number
    activeTrips: number
    maintenanceVehicles: number
    vehiclesWithAlert: number
    availableVehicles: number
  }
  warehouse: {
    totalAssets: number
    availableAssets: number
    loanedAssets: number
    maintenanceAssets: number
    activeLoans: number
    openAssetMaintenances: number
  }
  timeLogs: {
    pendingTimeLogs: number
    totalHoursLast7Days: number
  }
  fiveS: {
    totalAudits5S: number
    conformAudits5S: number
    pendingAudits5S: number
    conformityRate5S: number
  }
}

export const dashboardApi = {
  getSummary(): Promise<DashboardSummary> {
    return request('/dashboard/summary')
  }
}





