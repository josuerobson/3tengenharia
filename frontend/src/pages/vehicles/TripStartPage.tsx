// src/pages/vehicles/TripStartPage.tsx
// Formulário guiado em 2 etapas para registro de viagens.
//   Passo 1 (Saída)  — Seleciona veículo, KM inicial, origem, destino, finalidade.
//   Passo 2 (Chegada) — Exibe resumo da saída, coleta KM final, calcula distância em tempo real.

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Car,
  MapPin,
  Navigation,
  FileText,
  Gauge,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Search,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  User,
  Camera,
  Trash2,
  Fuel,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge, VEHICLE_STATUS_BADGE } from '@/components/ui/badge'
import {
  formatKm,
  formatDuration,
} from '@/data/mockData'
import { vehiclesApi, tripsApi, assetsApi, authApi, maintenanceApi, type ApiVehicle, type ApiTrip, type ApiEmployee, type ApiWorksite, type ApiMaintenanceAlert } from '@/lib/api'
import IncidentReportModal from '@/components/vehicles/IncidentReportModal'
import FuelRecordModal from '@/components/vehicles/FuelRecordModal'

// Usa ApiVehicle como tipo Vehicle para este componente
type Vehicle = ApiVehicle

// ── Stepper visual ────────────────────────────────────────────────────────────

interface StepperProps {
  currentStep: 1 | 2
}

function Stepper({ currentStep }: StepperProps) {
  const steps = [
    { number: 1, label: 'Saída', sublabel: 'Registrar partida' },
    { number: 2, label: 'Chegada', sublabel: 'Encerrar viagem' },
  ]

  return (
    <div className="flex items-center mb-8" role="list" aria-label="Etapas do formulário">
      {steps.map((step, i) => {
        const isActive = currentStep === step.number
        const isDone = currentStep > step.number

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                  'transition-all duration-300 ring-2',
                  isDone
                    ? 'bg-brand-primary ring-brand-primary text-white'
                    : isActive
                      ? 'bg-brand-primary ring-brand-primary text-white shadow-lg shadow-brand-primary/25'
                      : 'bg-white ring-gray-200 text-gray-400',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? <CheckCircle2 size={18} /> : step.number}
              </div>
              <div className="mt-1.5 text-center">
                <p
                  className={cn(
                    'text-xs font-semibold leading-none',
                    isActive || isDone ? 'text-brand-primary' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                  {step.sublabel}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-500',
                  isDone ? 'bg-brand-primary' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Combobox de veículos ──────────────────────────────────────────────────────

interface VehicleComboboxProps {
  value: Vehicle | null
  onChange: (v: Vehicle | null) => void
  error?: string
  vehicles: Vehicle[]
  loadingVehicles?: boolean
  allAlerts: ApiMaintenanceAlert[]
}

function VehicleCombobox({ value, onChange, error, vehicles, loadingVehicles, allAlerts }: VehicleComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [isOpen])

  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
          v.model.toLowerCase().includes(search.toLowerCase()) ||
          v.brand.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, vehicles],
  )

  const handleSelect = useCallback(
    (vehicle: Vehicle) => {
      const hasActiveTrip = !!(vehicle.trips && vehicle.trips.length > 0)
      if (vehicle.status !== 'ACTIVE' || hasActiveTrip) return
      onChange(vehicle)
      setIsOpen(false)
      setSearch('')
    },
    [onChange],
  )

  const statusBadge = value ? VEHICLE_STATUS_BADGE[value.status] : null

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          'flex items-center justify-between w-full h-12 px-4 rounded-xl border bg-white',
          'text-sm transition-all duration-150 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-primary/20',
          isOpen
            ? 'border-brand-primary ring-2 ring-brand-primary/20'
            : error
              ? 'border-red-400'
              : 'border-gray-200 hover:border-brand-primary/50',
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car size={16} className="text-brand-primary" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-bold text-gray-900 text-sm leading-none">
                {value.licensePlate}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {value.brand} {value.model} · {formatKm(value.currentKm)}
              </p>
            </div>
            {statusBadge && (
              <Badge variant={statusBadge.variant} dot className="flex-shrink-0">
                {statusBadge.label}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-gray-400">Selecionar veículo pela placa...</span>
        )}
        <ChevronDown
          size={16}
          className={cn(
            'text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span className="font-semibold">⚠</span> {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 z-30
                     bg-white rounded-xl border border-gray-200 shadow-dropdown
                     overflow-hidden animate-slide-down"
          role="listbox"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por placa ou modelo..."
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto scrollbar-thin py-1">
            {loadingVehicles ? (
              <div className="py-6 text-center text-gray-400 text-sm">Carregando veículos...</div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">
                Nenhum veículo encontrado
              </div>
            ) : (
              filtered.map((vehicle) => {
                const hasActiveTrip = !!(vehicle.trips && vehicle.trips.length > 0)
                const badge = VEHICLE_STATUS_BADGE[vehicle.status]
                const isDisabled = vehicle.status !== 'ACTIVE' || hasActiveTrip
                const isSelected = value?.id === vehicle.id

                const needsMaintenance = allAlerts.some(
                  a => a.vehicleId === vehicle.id && (a.urgency === 'critical' || a.urgency === 'high')
                )

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => handleSelect(vehicle)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-3 text-left',
                      'transition-colors duration-100',
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-brand-primary/8 text-brand-primary'
                          : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Car size={15} className="text-brand-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">
                          {vehicle.licensePlate}
                        </span>
                        {hasActiveTrip ? (
                          <Badge variant="brand" dot={false}>
                            Em Viagem
                          </Badge>
                        ) : (
                          <Badge variant={badge.variant} dot>
                            {badge.label}
                          </Badge>
                        )}
                        {needsMaintenance && (
                          <Badge variant="critical" dot className="animate-pulse flex-shrink-0">
                            Manutenção Crítica
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {vehicle.brand} {vehicle.model} · {formatKm(vehicle.currentKm)} · {vehicle.year}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={16} className="text-brand-primary flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface DepartureData {
  vehicle: Vehicle
  initialKm: number
  origin: string
  destination: string
  purpose: string
  departureTime: Date
  worksite?: { id: string; code: string; name: string } | null
}

type TripPageState = 'STEP_1' | 'STEP_2' | 'COMPLETED'

function getCurrentCoordinates(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    // Tenta primeiro com alta precisão
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      },
      (error) => {
        console.warn('Erro ao obter geolocalização com alta precisão, tentando baixa:', error.message)
        // Fallback: baixa precisão (mais rápido e tolerante a ambientes fechados/sem sinal de satélite)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          },
          (err) => {
            console.warn('Erro na geolocalização de baixa precisão:', err.message)
            resolve(null)
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 } // Aceita cache de até 5 minutos
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 } // 8s timeout, aceita cache de até 1 minuto
    )
  })
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function TripStartPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  // ── Estados da API ─────────────────────────────────────────────────────────
  const [vehiclesList, setVehiclesList]       = useState<Vehicle[]>([])
  const [ongoingTrips, setOngoingTrips]       = useState<ApiTrip[]>([])
  const [employeesList, setEmployeesList]     = useState<ApiEmployee[]>([])
  const [worksitesList, setWorksitesList]     = useState<ApiWorksite[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [apiError, setApiError]               = useState<string | null>(null)
  const [incidentTrip, setIncidentTrip]       = useState<ApiTrip | null>(null)
  const [fuelRecordTrip, setFuelRecordTrip]   = useState<ApiTrip | null>(null)
  const [allMaintenanceAlerts, setAllMaintenanceAlerts] = useState<ApiMaintenanceAlert[]>([])

  // ── Trip ID salvo após startTrip (para encerrar no passo 2) ────────────
  const [activeTripId, setActiveTripId] = useState<string | null>(null)

  // ── Estado da máquina ──────────────────────────────────────────────────
  const [pageState, setPageState] = useState<TripPageState>('STEP_1')

  // ── Dados do Passo 1 ───────────────────────────────────────────────────
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [initialKm, setInitialKm]             = useState('')
  const [origin, setOrigin]                   = useState('')
  const [destination, setDestination]         = useState('')
  const [purpose, setPurpose]                 = useState('')
  const [step1Errors, setStep1Errors]         = useState<Partial<Record<string, string>>>({})

  // Fotos de saída para ciclos de 10 viagens
  const [photoFront, setPhotoFront] = useState('')
  const [photoBack, setPhotoBack] = useState('')
  const [photoRight, setPhotoRight] = useState('')
  const [photoLeft, setPhotoLeft] = useState('')

  const photoFrontRef = useRef<HTMLInputElement>(null)
  const photoBackRef = useRef<HTMLInputElement>(null)
  const photoRightRef = useRef<HTMLInputElement>(null)
  const photoLeftRef = useRef<HTMLInputElement>(null)

  // Auto-preenche o KM inicial com o odômetro atual do veículo selecionado
  useEffect(() => {
    if (selectedVehicle) {
      setInitialKm(selectedVehicle.currentKm.toString())
    } else {
      setInitialKm('')
    }
  }, [selectedVehicle])

  // ── Dados do Passo 2 ───────────────────────────────────────────────────
  const [departureData, setDepartureData] = useState<DepartureData | null>(null)
  const [finalKm, setFinalKm]             = useState('')
  const [step2Errors, setStep2Errors]     = useState<Partial<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [arrivalOdometerPhoto, setArrivalOdometerPhoto] = useState<string>('')
  const odometerFileInputRef              = useRef<HTMLInputElement>(null)
  const [currentEmployeeProfile, setCurrentEmployeeProfile] = useState<ApiEmployee | null>(null)

  const selectedDriver = useMemo(() => {
    const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
    if (isManagerOrAdmin) {
      return employeesList.find(e => e.id === selectedDriverId)
    }
    return null
  }, [employeesList, selectedDriverId, currentUser])

  const isCnhExpired = useMemo(() => {
    const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
    const expiryStr = isManagerOrAdmin
      ? selectedDriver?.cnhExpirationDate
      : currentEmployeeProfile?.cnhExpirationDate

    if (!expiryStr) return false
    const expiryDate = new Date(expiryStr)
    expiryDate.setHours(23, 59, 59, 999)
    return expiryDate < new Date()
  }, [selectedDriver, currentEmployeeProfile, currentUser])

  const requiresPhotos = useMemo(() => {
    const totalTrips = selectedVehicle?._count?.trips ?? 0
    return totalTrips > 0 && totalTrips % 10 === 0
  }, [selectedVehicle])

  const allPhotosCaptured = useMemo(() => {
    return !requiresPhotos || (!!photoFront && !!photoBack && !!photoRight && !!photoLeft)
  }, [requiresPhotos, photoFront, photoBack, photoRight, photoLeft])

  const handlePhotoUpload = useCallback((side: 'front' | 'back' | 'right' | 'left') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1024

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          if (side === 'front') setPhotoFront(compressedBase64)
          else if (side === 'back') setPhotoBack(compressedBase64)
          else if (side === 'right') setPhotoRight(compressedBase64)
          else if (side === 'left') setPhotoLeft(compressedBase64)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  const vehicleMaintenanceAlert = useMemo(() => {
    if (!selectedVehicle) return null

    const criticalAlerts = allMaintenanceAlerts.filter(
      a => a.vehicleId === selectedVehicle.id && (a.urgency === 'critical' || a.urgency === 'high')
    )
    if (criticalAlerts.length === 0) return null

    const messages = criticalAlerts.map(a => {
      const details: string[] = []
      if (a.kmRemaining !== null && a.kmRemaining < 0) {
        details.push(`Vencido há ${Math.abs(a.kmRemaining).toLocaleString('pt-BR')} km`)
      }
      if (a.daysRemaining !== null && a.daysRemaining < 0) {
        details.push(`Vencido há ${Math.abs(a.daysRemaining)} dias`)
      }
      return `${a.name} (${details.join(', ') || 'Vencido'})`
    })

    return {
      message: messages.join(' · '),
    }
  }, [selectedVehicle, allMaintenanceAlerts])

  // ── Carregamento centralizado de dados ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoadingVehicles(true)
    setApiError(null)
    try {
      const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
      // Cada chamada tem seu próprio fallback — um 403 isolado (perfil sem
      // permissão pra uma das partes) não pode derrubar as demais que já
      // teriam funcionado.
      const [vehRes, tripsRes, empRes, worksitesRes, meRes, alertsRes] = await Promise.all([
        vehiclesApi.list().catch(() => ({ vehicles: [] as ApiVehicle[] })),
        tripsApi.list({ limit: 100 }).catch(() => ({ trips: [] as ApiTrip[], total: 0 })),
        (isManagerOrAdmin ? assetsApi.listEmployees() : Promise.resolve([])).catch(() => [] as ApiEmployee[]),
        assetsApi.listWorksites().catch(() => [] as ApiWorksite[]),
        (!isManagerOrAdmin ? authApi.me() : Promise.resolve(null)).catch(() => null),
        maintenanceApi.listAllAlerts().catch(() => [] as ApiMaintenanceAlert[]),
      ])
      setVehiclesList(vehRes.vehicles)
      const openTrips = tripsRes.trips.filter(t => t.arrivalDateTime === null || t.finalKm === null)
      setOngoingTrips(openTrips)
      if (isManagerOrAdmin && Array.isArray(empRes)) {
        setEmployeesList(empRes)
      }
      if (Array.isArray(worksitesRes)) {
        setWorksitesList(worksitesRes)
      }
      if (meRes?.user?.employee) {
        setCurrentEmployeeProfile(meRes.user.employee as unknown as ApiEmployee)
      }
      if (Array.isArray(alertsRes)) {
        setAllMaintenanceAlerts(alertsRes)
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao carregar dados do servidor.')
    } finally {
      setLoadingVehicles(false)
    }
  }, [currentUser])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Seleciona uma viagem em andamento da lista para encerrar
  const handleSelectOngoingTrip = useCallback((trip: ApiTrip) => {
    const fullVehicle = vehiclesList.find(v => v.id === trip.vehicle.id)
    const vehicleObj = fullVehicle || {
      ...trip.vehicle,
      color: null,
      fuelType: null,
      maintenanceKmThreshold: null,
      maintenanceDayThreshold: null,
      lastMaintenanceKm: null,
      lastMaintenanceDate: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    } as unknown as ApiVehicle

    setActiveTripId(trip.id)
    setDepartureData({
      vehicle: vehicleObj,
      initialKm: trip.initialKm,
      origin: trip.origin,
      destination: trip.destination,
      purpose: trip.purpose ?? '',
      departureTime: new Date(trip.departureDateTime),
      worksite: trip.worksite,
    })
    setPageState('STEP_2')
  }, [vehiclesList])

  // ── Cálculos em tempo real (Passo 2) ───────────────────────────────────
  const distanceTraveled = useMemo(() => {
    if (!departureData) return null
    const final = parseInt(finalKm.replace(/\D/g, ''), 10)
    if (isNaN(final) || final < departureData.initialKm) return null
    return final - departureData.initialKm
  }, [finalKm, departureData])

  const durationMinutes = useMemo(() => {
    if (!departureData) return null
    const now = new Date()
    return Math.round((now.getTime() - departureData.departureTime.getTime()) / 60_000)
  }, [departureData, finalKm]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validação Passo 1 ─────────────────────────────────────────────────
  const validateStep1 = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!selectedVehicle) errors.vehicle = 'Selecione um veículo.'
    if (!initialKm) {
      errors.initialKm = 'KM inicial é obrigatório.'
    } else {
      const km = parseInt(initialKm.replace(/\D/g, ''), 10)
      if (isNaN(km)) {
        errors.initialKm = 'Informe um número válido.'
      } else if (selectedVehicle && km < selectedVehicle.currentKm) {
        errors.initialKm = `KM não pode ser menor que o odômetro atual do veículo (${selectedVehicle.currentKm.toLocaleString('pt-BR')} km).`
      }
    }
    if (!origin.trim()) errors.origin = 'Informe a origem.'
    if (!destination.trim()) errors.destination = 'Informe o destino.'
    if (!selectedWorksiteId) errors.worksite = 'Selecione a obra / centro de custo.'

    const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
    if (isManagerOrAdmin && !selectedDriverId) {
      errors.driver = 'Selecione o motorista responsável pela viagem.'
    } else if (isCnhExpired) {
      errors.driver = 'A CNH do motorista está vencida. Não é possível iniciar a viagem.'
    }

    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }, [selectedVehicle, initialKm, origin, destination, currentUser, selectedDriverId, selectedWorksiteId, isCnhExpired])

  const handleOdometerPhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1024

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          setArrivalOdometerPhoto(compressedBase64)
          setStep2Errors(prev => ({ ...prev, photo: undefined }))
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Validação Passo 2 ─────────────────────────────────────────────────
  const validateStep2 = useCallback((): boolean => {
    const errors: Record<string, string> = {}
    if (!departureData) return false
    if (!finalKm) {
      errors.finalKm = 'KM final é obrigatório.'
    } else {
      const km = parseInt(finalKm.replace(/\D/g, ''), 10)
      if (isNaN(km)) {
        errors.finalKm = 'Informe um número válido.'
      } else if (km < departureData.initialKm) {
        errors.finalKm = `KM final não pode ser menor que o KM inicial (${departureData.initialKm.toLocaleString('pt-BR')} km).`
      }
    }
    if (!arrivalOdometerPhoto) {
      errors.photo = 'A foto do hodômetro de chegada é obrigatória.'
    }
    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }, [departureData, finalKm, arrivalOdometerPhoto])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStep1Submit = useCallback(async () => {
    if (!validateStep1() || !selectedVehicle) return
    const initialKmValue = parseInt(initialKm.replace(/\D/g, ''), 10)

    if (vehicleMaintenanceAlert) {
      const confirmStart = window.confirm(
        `ATENÇÃO: Este veículo está com a manutenção preventiva em estado crítico!\n\nDetalhes:\n${vehicleMaintenanceAlert.message}\n\nDeseja realmente iniciar a viagem com este veículo?`
      )
      if (!confirmStart) return
    }

    setIsSubmitting(true)
    setApiError(null)
    try {
      const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
      const coords = await getCurrentCoordinates()
      const selectedWorksite = worksitesList.find(w => w.id === selectedWorksiteId)
      const res = await tripsApi.start({
        vehicleId:   selectedVehicle.id,
        initialKm:   initialKmValue,
        origin:      origin.trim(),
        destination: destination.trim(),
        purpose:     purpose.trim() || undefined,
        departureGeolocation: coords || undefined,
        worksiteId:  selectedWorksiteId || undefined,
        ...(isManagerOrAdmin && selectedDriverId ? { driverEmployeeId: selectedDriverId } : {}),
        ...(requiresPhotos ? {
          departurePhotoFront: photoFront || undefined,
          departurePhotoBack:  photoBack || undefined,
          departurePhotoRight: photoRight || undefined,
          departurePhotoLeft:  photoLeft || undefined,
        } : {}),
      })
      setActiveTripId(res.trip.id)
      setDepartureData({
        vehicle: selectedVehicle,
        initialKm: initialKmValue,
        origin: origin.trim(),
        destination: destination.trim(),
        purpose: purpose.trim(),
        departureTime: new Date(res.trip.departureDateTime),
        worksite: selectedWorksite || null,
      })
      setPageState('STEP_2')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao iniciar viagem.')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateStep1, selectedVehicle, initialKm, origin, destination, purpose, currentUser, selectedDriverId, selectedWorksiteId, worksitesList, vehicleMaintenanceAlert, requiresPhotos, photoFront, photoBack, photoRight, photoLeft])

  const handleStep2Submit = useCallback(async () => {
    if (!validateStep2() || !activeTripId) return
    const finalKmValue = parseInt(finalKm.replace(/\D/g, ''), 10)
    setIsSubmitting(true)
    setApiError(null)
    try {
      const coords = await getCurrentCoordinates()
      await tripsApi.end(activeTripId, {
        finalKm: finalKmValue,
        arrivalGeolocation: coords || undefined,
        arrivalOdometerPhoto,
      })
      setPageState('COMPLETED')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao encerrar viagem.')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateStep2, activeTripId, finalKm, arrivalOdometerPhoto])

  const handleReset = useCallback(() => {
    setPageState('STEP_1')
    setSelectedVehicle(null)
    setInitialKm('')
    setOrigin('')
    setDestination('')
    setPurpose('')
    setFinalKm('')
    setDepartureData(null)
    setStep1Errors({})
    setStep2Errors({})
    setActiveTripId(null)
    setApiError(null)
    setSelectedDriverId('')
    setSelectedWorksiteId('')
    setArrivalOdometerPhoto('')
    setPhotoFront('')
    setPhotoBack('')
    setPhotoRight('')
    setPhotoLeft('')
    void fetchData()
  }, [fetchData])

  const handleBackToStep1 = useCallback(() => {
    setPageState('STEP_1')
    setFinalKm('')
    setStep2Errors({})
    setActiveTripId(null)
    setDepartureData(null)
    setSelectedWorksiteId('')
    setArrivalOdometerPhoto('')
    void fetchData()
  }, [fetchData])

  // ────────────────────────────────────────────────────────────────────────
  // TELA DE SUCESSO
  // ────────────────────────────────────────────────────────────────────────
  if (pageState === 'COMPLETED' && departureData) {
    const finalKmValue = parseInt(finalKm.replace(/\D/g, ''), 10)
    const dist = finalKmValue - departureData.initialKm
    return (
      <div className="max-w-md mx-auto pt-4 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Viagem Encerrada!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Registros atualizados com sucesso.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3 mb-6">
            <InfoRow icon={Car} label="Veículo" value={`${departureData.vehicle.licensePlate} — ${departureData.vehicle.model}`} />
            <InfoRow icon={Navigation} label="Rota" value={`${departureData.origin} → ${departureData.destination}`} />
            <InfoRow icon={Gauge} label="Distância" value={`${dist.toLocaleString('pt-BR')} km percorridos`} />
            {departureData.worksite && (
              <InfoRow icon={FileText} label="Obra / Centro de Custo" value={`${departureData.worksite.code} — ${departureData.worksite.name}`} />
            )}
            {durationMinutes && (
              <InfoRow icon={Clock} label="Duração" value={formatDuration(durationMinutes)} />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => navigate('/vehicles/trips')}>
              Ver Histórico de Viagens
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={handleReset}>
              <RotateCcw size={16} />
              Registrar Nova Viagem
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // LAYOUT BASE
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      {/* Breadcrumb / título */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Registro de Viagem</h1>
        <p className="text-gray-500 text-sm mt-0.5">Módulo de Controle de Veículos</p>
      </div>

      {/* Seção: Viagens em Andamento (Lista de Pendências) */}
      {pageState === 'STEP_1' && ongoingTrips.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-brand-accent" />
            Viagens em Andamento ({ongoingTrips.length})
          </h2>
          <div className="space-y-3">
            {ongoingTrips.map((trip) => {
              const hasAlert = trip.maintenanceAlertActive
              return (
                <div
                  key={trip.id}
                  className={cn(
                    "bg-white rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md border",
                    hasAlert ? "border-red-300 bg-red-50/10" : "border-amber-200"
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">
                        {trip.vehicle.licensePlate}
                      </span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-xs text-gray-500 font-medium truncate">
                        {trip.vehicle.brand} {trip.vehicle.model}
                      </span>
                      <Badge variant="accent" dot>Em andamento</Badge>
                      {hasAlert && (
                        <Badge variant="critical" dot className="animate-pulse flex-shrink-0">
                          Alerta Manutenção
                        </Badge>
                      )}
                    </div>
                  <div className="flex flex-col gap-0.5 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1 text-gray-600 font-medium">
                      <User size={12} className="text-gray-400" />
                      {trip.driverEmployee?.fullName ?? 'Motorista não informado'}
                    </span>
                    <span className="flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-gray-300" />
                      {trip.origin} → {trip.destination}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={10} />
                    Início: {new Date(trip.departureDateTime).toLocaleDateString('pt-BR')} às {new Date(trip.departureDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:self-center">
                  <button
                    type="button"
                    onClick={() => setFuelRecordTrip(trip)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <Fuel size={13} />
                    Registro de Abastecimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncidentTrip(trip)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-650 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <AlertTriangle size={13} />
                    Reportar Sinistro
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectOngoingTrip(trip)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-[#003d4f] rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <CheckCircle2 size={13} />
                    Encerrar Viagem
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-5 sm:p-7">
        <Stepper currentStep={pageState === 'STEP_1' ? 1 : 2} />

        {/* ───── PASSO 1: SAÍDA ───── */}
        {pageState === 'STEP_1' && (
          <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                <Car size={16} className="text-brand-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Dados de Saída</h2>
                <p className="text-xs text-gray-400">Preencha as informações da partida</p>
              </div>
            </div>

            {/* Seleção de Veículo */}
            <div className="space-y-2.5">
              <div>
                <Label required>Veículo</Label>
                <VehicleCombobox
                  value={selectedVehicle}
                  onChange={setSelectedVehicle}
                  error={step1Errors.vehicle}
                  vehicles={vehiclesList}
                  loadingVehicles={loadingVehicles}
                  allAlerts={allMaintenanceAlerts}
                />
              </div>

              {/* Alerta de Manutenção Crítica */}
              {vehicleMaintenanceAlert && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5 animate-pulse" size={20} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-800">Atenção: Manutenção Preventiva Crítica!</p>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      Este veículo necessita de revisão preventiva urgente:
                    </p>
                    <p className="text-xs text-red-650 mt-1 font-semibold leading-relaxed">
                      {vehicleMaintenanceAlert.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Motorista */}
            {currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER') ? (
              <div>
                <Label htmlFor="driver" required>
                  Motorista
                </Label>
                <select
                  id="driver"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                  required
                >
                  <option value="">Selecionar motorista...</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.registration} — {emp.position})
                    </option>
                  ))}
                </select>
                {step1Errors.driver && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <span className="font-semibold">⚠</span> {step1Errors.driver}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label>Motorista</Label>
                <div className="mt-1.5 flex items-center gap-3 w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 font-medium">
                  <User size={16} className="text-gray-400" />
                  <span>{currentUser?.name || 'Carregando...'}</span>
                </div>
              </div>
            )}

            {/* Obra / Centro de Custo */}
            <div>
              <Label htmlFor="worksite" required>
                Obra / Centro de Custo
              </Label>
              <select
                id="worksite"
                value={selectedWorksiteId}
                onChange={(e) => setSelectedWorksiteId(e.target.value)}
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                required
              >
                <option value="">Selecionar obra / centro de custo...</option>
                {worksitesList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
              {step1Errors.worksite && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span className="font-semibold">⚠</span> {step1Errors.worksite}
                </p>
              )}
            </div>

            {/* KM Inicial */}
            <div>
              <Label htmlFor="initialKm" required>KM Inicial (Odômetro)</Label>
              {selectedVehicle && (
                <p className="text-xs text-gray-400 mb-1.5">
                  Odômetro atual registrado:{' '}
                  <span className="font-semibold text-brand-primary">
                    {formatKm(selectedVehicle.currentKm)}
                  </span>
                </p>
              )}
              <Input
                id="initialKm"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 48.320"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value.replace(/\D/g, ''))}
                error={step1Errors.initialKm}
                icon={<Gauge size={16} />}
                className="text-lg font-semibold tracking-wide"
                autoComplete="off"
              />
              {initialKm && !step1Errors.initialKm && (
                <p className="mt-1 text-sm text-brand-primary font-semibold">
                  {parseInt(initialKm).toLocaleString('pt-BR')} km
                </p>
              )}
            </div>

            {/* Origem e Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origin" required>Origem</Label>
                <Input
                  id="origin"
                  placeholder="Local de partida"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  error={step1Errors.origin}
                  icon={<MapPin size={16} />}
                />
              </div>
              <div>
                <Label htmlFor="destination" required>Destino</Label>
                <Input
                  id="destination"
                  placeholder="Local de chegada"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  error={step1Errors.destination}
                  icon={<Navigation size={16} />}
                />
              </div>
            </div>

            {/* Finalidade */}
            <div>
              <Label htmlFor="purpose">Finalidade / Observações</Label>
              <Textarea
                id="purpose"
                placeholder="Ex: Transporte de materiais para obra, visita técnica..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
              />
            </div>

            {/* Alerta de Registro Fotográfico Obrigatório (Ciclo de 10 viagens) */}
            {requiresPhotos && (
              <div className="flex flex-col gap-3.5 p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in text-left">
                <div className="flex items-start gap-3">
                  <Camera className="text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" size={20} />
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      Registro Fotográfico Obrigatório (Fim de Ciclo de 10 Viagens)
                    </p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Este veículo atingiu o ciclo de 10 viagens registradas. É obrigatório anexar 4 fotos nítidas dos 4 lados do veículo (frente, trás, lado direito e lado esquerdo), enquadrando o veículo por inteiro, antes de iniciar esta viagem.
                    </p>
                  </div>
                </div>

                {/* 4 fotos em formato grid */}
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <PhotoCaptureCard
                    side="Frente"
                    value={photoFront}
                    onCapture={() => photoFrontRef.current?.click()}
                    onDelete={() => setPhotoFront('')}
                  />
                  <PhotoCaptureCard
                    side="Trás"
                    value={photoBack}
                    onCapture={() => photoBackRef.current?.click()}
                    onDelete={() => setPhotoBack('')}
                  />
                  <PhotoCaptureCard
                    side="Lado Direito"
                    value={photoRight}
                    onCapture={() => photoRightRef.current?.click()}
                    onDelete={() => setPhotoRight('')}
                  />
                  <PhotoCaptureCard
                    side="Lado Esquerdo"
                    value={photoLeft}
                    onCapture={() => photoLeftRef.current?.click()}
                    onDelete={() => setPhotoLeft('')}
                  />
                </div>

                {/* File inputs escondidos */}
                <input ref={photoFrontRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload('front')} className="hidden" />
                <input ref={photoBackRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload('back')} className="hidden" />
                <input ref={photoRightRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload('right')} className="hidden" />
                <input ref={photoLeftRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload('left')} className="hidden" />
              </div>
            )}

            {isCnhExpired && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in mb-3">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-left">
                  <p className="text-sm font-bold text-red-800">CNH Vencida!</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    O motorista selecionado está com a CNH vencida (vencimento em:{' '}
                    {(() => {
                      const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')
                      const expiry = isManagerOrAdmin
                        ? selectedDriver?.cnhExpirationDate
                        : currentUser?.cnhExpirationDate
                      return expiry ? new Date(expiry).toLocaleDateString('pt-BR') : ''
                    })()}
                    ). Não é permitido iniciar uma nova viagem com a CNH vencida.
                  </p>
                </div>
              </div>
            )}

            {apiError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                <AlertCircle size={14} /> {apiError}
              </p>
            )}

            <Button
              size="lg"
              className="w-full mt-2"
              onClick={() => void handleStep1Submit()}
              disabled={isSubmitting || isCnhExpired || !allPhotosCaptured}
            >
              {isSubmitting ? (
                'Registrando...'
              ) : !allPhotosCaptured ? (
                <>
                  <Camera size={18} />
                  Registrar Fotos (Pendentes)
                </>
              ) : (
                <>
                  Registrar Saída
                  <ArrowRight size={18} />
                </>
              )}
            </Button>

          </div>
        )}

        {/* ───── PASSO 2: CHEGADA ───── */}
        {pageState === 'STEP_2' && departureData && (
          <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={16} className="text-brand-accent" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Dados de Chegada</h2>
                <p className="text-xs text-gray-400">Preencha o odômetro de chegada</p>
              </div>
            </div>

            {/* Alerta de Manutenção Crítica em Andamento */}
            {vehicleMaintenanceAlert && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-left">
                  <p className="text-sm font-bold text-red-800">Atenção: Veículo com Manutenção Crítica!</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Esta viagem está sendo realizada com o veículo em atraso de manutenção preventiva:
                  </p>
                  <p className="text-xs text-red-650 mt-1 font-semibold leading-relaxed">
                    {vehicleMaintenanceAlert.message}
                  </p>
                </div>
              </div>
            )}

            {/* Resumo da saída */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Resumo da Saída
              </p>
              <InfoRow icon={Car} label="Veículo" value={`${departureData.vehicle.licensePlate} — ${departureData.vehicle.brand} ${departureData.vehicle.model}`} />
              <InfoRow icon={MapPin} label="Origem" value={departureData.origin} />
              <InfoRow icon={Navigation} label="Destino" value={departureData.destination} />
              <InfoRow icon={Gauge} label="KM de Saída" value={formatKm(departureData.initialKm)} />
              <InfoRow
                icon={Clock}
                label="Hora de Saída"
                value={departureData.departureTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              />
              {departureData.worksite && (
                <InfoRow icon={FileText} label="Obra / C. Custo" value={`${departureData.worksite.code} — ${departureData.worksite.name}`} />
              )}
              {departureData.purpose && (
                <InfoRow icon={FileText} label="Finalidade" value={departureData.purpose} />
              )}
            </div>

            {/* KM Final */}
            <div>
              <Label htmlFor="finalKm" required>KM Final (Odômetro de Chegada)</Label>
              <Input
                id="finalKm"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`Mín: ${departureData.initialKm.toLocaleString('pt-BR')}`}
                value={finalKm}
                onChange={(e) => setFinalKm(e.target.value.replace(/\D/g, ''))}
                error={step2Errors.finalKm}
                icon={<Gauge size={16} />}
                className="text-lg font-semibold tracking-wide"
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Foto Comprovante do Hodômetro */}
            <div className="space-y-1.5">
              <Label required>Foto Comprovante do Hodômetro (Chegada)</Label>
              
              {arrivalOdometerPhoto ? (
                <div className="relative rounded-2xl border border-gray-150 overflow-hidden w-full h-44 bg-gray-50 flex items-center justify-center group">
                  <img
                    src={arrivalOdometerPhoto}
                    alt="Foto Hodômetro Chegada"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setArrivalOdometerPhoto('')}
                    className="absolute bottom-3 right-3 p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <Trash2 size={14} /> Excluir e Tirar Outra
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => odometerFileInputRef.current?.click()}
                    className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-primary/50 hover:bg-slate-50 flex flex-col items-center justify-center text-gray-400 hover:text-brand-primary transition-all gap-2"
                  >
                    <Camera size={26} />
                    <span className="text-xs font-bold">Capturar Foto do Painel/Hodômetro</span>
                    <span className="text-[10px] text-gray-400">Clique para abrir a câmera</span>
                  </button>
                  <input
                    ref={odometerFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleOdometerPhotoAdd}
                    className="hidden"
                  />
                </div>
              )}
              {step2Errors.photo && (
                <p className="text-xs text-red-500 font-semibold">{step2Errors.photo}</p>
              )}
            </div>

            {/* Cálculo em tempo real */}
            {distanceTraveled !== null && (
              <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-2xl p-5 text-center animate-fade-in">
                <p className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider mb-1">
                  Quilometragem Rodada
                </p>
                <p className="text-5xl font-extrabold text-brand-primary tabular-nums">
                  {distanceTraveled.toLocaleString('pt-BR')}
                  <span className="text-2xl font-bold ml-1 text-brand-primary/70">km</span>
                </p>
                {durationMinutes !== null && durationMinutes > 0 && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
                    <Clock size={13} />
                    Duração estimada: {formatDuration(durationMinutes)}
                  </p>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-shrink-0"
                  onClick={handleBackToStep1}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={18} />
                  Voltar
                </Button>
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1 text-base font-bold shadow-lg shadow-brand-accent/20"
                  onClick={handleStep2Submit}
                  disabled={isSubmitting || distanceTraveled === null || !arrivalOdometerPhoto}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Encerrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Encerrar Viagem
                    </>
                  )}
                </Button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeTripId && departureData) {
                    setFuelRecordTrip({
                      id: activeTripId,
                      vehicle: departureData.vehicle,
                    } as unknown as ApiTrip)
                  }
                }}
                className="w-full h-12 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
              >
                <Fuel size={15} />
                Registro de Abastecimento
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTripId && departureData) {
                    setIncidentTrip({
                      id: activeTripId,
                      vehicle: departureData.vehicle,
                    } as unknown as ApiTrip)
                  }
                }}
                className="w-full h-12 border border-red-200 hover:bg-red-50 text-red-650 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
              >
                <AlertTriangle size={15} />
                Registrar Sinistro / Ocorrência
              </button>
            </div>

            {/* Aviso de manutenção (se aplicável) */}
            {departureData.vehicle.maintenanceKmThreshold &&
              departureData.vehicle.lastMaintenanceKm &&
              distanceTraveled !== null && (() => {
                const totalKm =
                  departureData.initialKm +
                  distanceTraveled -
                  departureData.vehicle.lastMaintenanceKm
                const needsMaint =
                  totalKm >= (departureData.vehicle.maintenanceKmThreshold ?? Infinity)
                return needsMaint ? (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Alerta de Manutenção</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Este veículo atingirá o limiar de manutenção preventiva ao encerrar esta viagem. O status será alterado automaticamente.
                      </p>
                    </div>
                  </div>
                ) : null
              })()}
          </div>
        )}
      </div>
      {/* Modal de Registro de Sinistro */}
      {incidentTrip && (
        <IncidentReportModal
          tripId={incidentTrip.id}
          vehiclePlate={incidentTrip.vehicle.licensePlate}
          vehicleModel={incidentTrip.vehicle.model}
          onClose={() => setIncidentTrip(null)}
          onSuccess={() => {
            setIncidentTrip(null)
            void fetchData()
          }}
        />
      )}
      {/* Modal de Registro de Abastecimento */}
      {fuelRecordTrip && (
        <FuelRecordModal
          tripId={fuelRecordTrip.id}
          vehiclePlate={fuelRecordTrip.vehicle.licensePlate}
          vehicleModel={fuelRecordTrip.vehicle.model}
          onClose={() => setFuelRecordTrip(null)}
          onSuccess={() => {
            setFuelRecordTrip(null)
            void fetchData()
          }}
        />
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function PhotoCaptureCard({
  side,
  value,
  onCapture,
  onDelete,
}: {
  side: string
  value: string
  onCapture: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-500">{side} *</span>
      {value ? (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden h-20 bg-gray-50 flex items-center justify-center group">
          <img src={value} alt={`Foto ${side}`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onDelete}
            className="absolute bottom-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
            title="Excluir"
          >
            <Trash2 size={10} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onCapture}
          className="h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-primary/50 hover:bg-white flex flex-col items-center justify-center text-gray-400 hover:text-brand-primary transition-all gap-1 p-1"
        >
          <Camera size={16} />
          <span className="text-[9px] font-bold text-center">Tirar foto</span>
        </button>
      )}
    </div>
  )
}
