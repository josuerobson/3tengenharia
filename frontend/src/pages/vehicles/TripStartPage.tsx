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
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge, VEHICLE_STATUS_BADGE } from '@/components/ui/badge'
import {
  formatKm,
  formatDuration,
} from '@/data/mockData'
import { vehiclesApi, tripsApi, type ApiVehicle, type ApiTrip } from '@/lib/api'

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
}

function VehicleCombobox({ value, onChange, error, vehicles, loadingVehicles }: VehicleComboboxProps) {
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
      if (vehicle.status !== 'ACTIVE') return
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
                const badge = VEHICLE_STATUS_BADGE[vehicle.status]
                const isDisabled = vehicle.status !== 'ACTIVE'
                const isSelected = value?.id === vehicle.id

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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {vehicle.licensePlate}
                        </span>
                        <Badge variant={badge.variant} dot>
                          {badge.label}
                        </Badge>
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
}

type TripPageState = 'STEP_1' | 'STEP_2' | 'COMPLETED'

// ── Página principal ─────────────────────────────────────────────────────────

export default function TripStartPage() {
  const navigate = useNavigate()

  // ── Estados da API ─────────────────────────────────────────────────────────
  const [vehiclesList, setVehiclesList]       = useState<Vehicle[]>([])
  const [ongoingTrips, setOngoingTrips]       = useState<ApiTrip[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [apiError, setApiError]               = useState<string | null>(null)

  // ── Trip ID salvo após startTrip (para encerrar no passo 2) ────────────
  const [activeTripId, setActiveTripId] = useState<string | null>(null)

  // ── Estado da máquina ──────────────────────────────────────────────────
  const [pageState, setPageState] = useState<TripPageState>('STEP_1')

  // ── Dados do Passo 1 ───────────────────────────────────────────────────
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [initialKm, setInitialKm]             = useState('')
  const [origin, setOrigin]                   = useState('')
  const [destination, setDestination]         = useState('')
  const [purpose, setPurpose]                 = useState('')
  const [step1Errors, setStep1Errors]         = useState<Partial<Record<string, string>>>({})

  // ── Dados do Passo 2 ───────────────────────────────────────────────────
  const [departureData, setDepartureData] = useState<DepartureData | null>(null)
  const [finalKm, setFinalKm]             = useState('')
  const [step2Errors, setStep2Errors]     = useState<Partial<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting]   = useState(false)

  // ── Carregamento centralizado de dados ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoadingVehicles(true)
    setApiError(null)
    try {
      const [vehRes, tripsRes] = await Promise.all([
        vehiclesApi.list(),
        tripsApi.list({ limit: 100 }),
      ])
      setVehiclesList(vehRes.vehicles)
      const openTrips = tripsRes.trips.filter(t => t.arrivalDateTime === null || t.finalKm === null)
      setOngoingTrips(openTrips)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao carregar dados do servidor.')
    } finally {
      setLoadingVehicles(false)
    }
  }, [])

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

    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }, [selectedVehicle, initialKm, origin, destination])

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
    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }, [departureData, finalKm])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStep1Submit = useCallback(async () => {
    if (!validateStep1() || !selectedVehicle) return
    const initialKmValue = parseInt(initialKm.replace(/\D/g, ''), 10)
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await tripsApi.start({
        vehicleId:   selectedVehicle.id,
        initialKm:   initialKmValue,
        origin:      origin.trim(),
        destination: destination.trim(),
        purpose:     purpose.trim() || undefined,
      })
      setActiveTripId(res.trip.id)
      setDepartureData({
        vehicle: selectedVehicle,
        initialKm: initialKmValue,
        origin: origin.trim(),
        destination: destination.trim(),
        purpose: purpose.trim(),
        departureTime: new Date(res.trip.departureDateTime),
      })
      setPageState('STEP_2')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao iniciar viagem.')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateStep1, selectedVehicle, initialKm, origin, destination, purpose])

  const handleStep2Submit = useCallback(async () => {
    if (!validateStep2() || !activeTripId) return
    const finalKmValue = parseInt(finalKm.replace(/\D/g, ''), 10)
    setIsSubmitting(true)
    setApiError(null)
    try {
      await tripsApi.end(activeTripId, { finalKm: finalKmValue })
      setPageState('COMPLETED')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao encerrar viagem.')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateStep2, activeTripId, finalKm])

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
    void fetchData()
  }, [fetchData])

  const handleBackToStep1 = useCallback(() => {
    setPageState('STEP_1')
    setFinalKm('')
    setStep2Errors({})
    setActiveTripId(null)
    setDepartureData(null)
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
            {ongoingTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md"
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
                <button
                  type="button"
                  onClick={() => handleSelectOngoingTrip(trip)}
                  className="sm:self-center flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-[#003d4f] rounded-xl transition-all shadow-sm flex-shrink-0"
                >
                  <CheckCircle2 size={13} />
                  Encerrar Viagem
                </button>
              </div>
            ))}
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
            <div>
              <Label required>Veículo</Label>
              <VehicleCombobox
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                error={step1Errors.vehicle}
                vehicles={vehiclesList}
                loadingVehicles={loadingVehicles}
              />
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

            {apiError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                <AlertCircle size={14} /> {apiError}
              </p>
            )}

            <Button
              size="lg"
              className="w-full mt-2"
              onClick={() => void handleStep1Submit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Saída'}
              <ArrowRight size={18} />
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

            {/* Ações */}
            <div className="flex gap-3 pt-1">
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
                disabled={isSubmitting || distanceTraveled === null}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper visual para linhas de informação ───────────────────────────────────

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
