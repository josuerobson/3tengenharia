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
  }): Promise<{ message: string; trip: ApiTrip; maintenanceAlert?: unknown }> {
    return request('/vehicles/trips/start', { method: 'POST', body: JSON.stringify(data) })
  },

  end(tripId: string, data: {
    finalKm: number
    arrivalDateTime?: string
    notes?: string
  }): Promise<{ message: string; trip: ApiTrip; distanceTraveled: number }> {
    return request(`/vehicles/trips/${tripId}/end`, { method: 'POST', body: JSON.stringify(data) })
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
    data: { serviceKm: number; serviceDate?: string }
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
}


