// src/pages/vehicles/TripHistoryPage.tsx
// Histórico completo de viagens — filtros, busca, detalhes e KPIs de frota.
// Dados reais do backend via API REST (GET /vehicles/trips).

import { useState, useMemo, useEffect } from 'react'
import {
  MapPin, User, Gauge, Clock, Search,
  ChevronDown, ChevronUp, X, Filter, Download,
  AlertTriangle, CheckCircle2, TrendingUp, Car,
  Navigation, Route, ArrowRight, Eye, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { tripsApi, type ApiTrip } from '@/lib/api'

// ── Alias de tipo local para compatibilidade com o restante do componente ─────
type Trip = ApiTrip

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
  }
}

function formatDuration(dep: string, arr: string | null): string {
  if (!arr) return '—'
  const ms = new Date(arr).getTime() - new Date(dep).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h === 0) return `${m}min`
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function isOngoing(trip: Trip): boolean {
  return trip.arrivalDateTime === null || trip.finalKm === null
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function buildKpis(trips: Trip[]) {
  const completed = trips.filter(t => !isOngoing(t))
  const ongoing   = trips.filter(t => isOngoing(t))
  const withAlert = trips.filter(t => t.maintenanceAlertActive)
  const totalKm   = completed.reduce((s, t) => s + (t.distanceTraveled ?? 0), 0)
  const uniqueVehicles = new Set(trips.map(t => t.vehicle.id)).size
  return { total: trips.length, completed: completed.length, ongoing: ongoing.length, withAlert: withAlert.length, totalKm, uniqueVehicles }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function TripStatusBadge({ trip }: { trip: Trip }) {
  if (isOngoing(trip)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Em andamento
      </span>
    )
  }
  if (trip.maintenanceAlertActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5">
        <AlertTriangle size={10} />
        Alerta manutenção
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5">
      <CheckCircle2 size={10} />
      Concluída
    </span>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const dep = formatDateTime(trip.departureDateTime)
  const arr = trip.arrivalDateTime ? formatDateTime(trip.arrivalDateTime) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00475B] to-[#006880] px-6 pt-6 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-white/60 uppercase tracking-widest">
                  #{trip.id.replace('trip-', '')}
                </span>
                <TripStatusBadge trip={trip} />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {trip.vehicle.brand} {trip.vehicle.model}
              </h2>
              <p className="text-sm text-white/70">{trip.vehicle.licensePlate}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Rota visual */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Origem</p>
              <p className="text-sm font-medium text-white truncate">{trip.origin}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
              <div className="w-6 h-px bg-white/30" />
              <ArrowRight size={14} className="text-white/50" />
              <div className="w-6 h-px bg-white/30" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Destino</p>
              <p className="text-sm font-medium text-white truncate">{trip.destination}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Motorista */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
            <div className="w-10 h-10 rounded-xl bg-[#00475B]/10 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-[#00475B]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Motorista</p>
              <p className="text-sm font-semibold text-gray-800">{trip.driverEmployee?.fullName ?? 'Motorista não informado'}</p>
              <p className="text-xs text-gray-400">{trip.driverEmployee?.registration ?? ''}</p>
            </div>
          </div>

          {/* Finalidade */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50">
            <div className="w-10 h-10 rounded-xl bg-[#00475B]/10 flex items-center justify-center flex-shrink-0">
              <Navigation size={18} className="text-[#00475B]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Finalidade</p>
              <p className="text-sm font-semibold text-gray-800">{trip.purpose}</p>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 p-3 text-center">
              <Clock size={14} className="mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Duração</p>
              <p className="text-sm font-bold text-gray-800">
                {formatDuration(trip.departureDateTime, trip.arrivalDateTime)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-3 text-center">
              <Route size={14} className="mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Distância</p>
              <p className="text-sm font-bold text-gray-800">
                {trip.distanceTraveled != null ? `${trip.distanceTraveled.toLocaleString('pt-BR')} km` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-3 text-center">
              <Gauge size={14} className="mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">KM final</p>
              <p className="text-sm font-bold text-gray-800">
                {trip.finalKm != null ? trip.finalKm.toLocaleString('pt-BR') : '—'}
              </p>
            </div>
          </div>

          {/* Datas */}
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <p className="text-xs text-gray-400 font-medium">Partida</p>
                </div>
                <p className="text-xs font-semibold text-gray-700">{dep.date} ({dep.dayName})</p>
                <p className="text-lg font-bold text-gray-900">{dep.time}</p>
                <p className="text-xs text-gray-400 mt-0.5">KM inicial: {trip.initialKm.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', arr ? 'bg-gray-400' : 'bg-blue-400 animate-pulse')} />
                  <p className="text-xs text-gray-400 font-medium">Chegada</p>
                </div>
                {arr ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700">{arr.date} ({arr.dayName})</p>
                    <p className="text-lg font-bold text-gray-900">{arr.time}</p>
                    <p className="text-xs text-gray-400 mt-0.5">KM final: {trip.finalKm?.toLocaleString('pt-BR') ?? '—'}</p>
                  </>
                ) : (
                  <p className="text-sm text-blue-500 font-medium mt-1">Em andamento...</p>
                )}
              </div>
            </div>
          </div>

          {/* Alerta de manutenção */}
          {trip.maintenanceAlertActive && (
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Alerta de manutenção ativo</p>
                <p className="text-xs text-red-500">
                  Esta viagem foi realizada com alerta de manutenção preventiva ativo no veículo.
                  Verifique o painel de alertas.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

type FilterStatus = 'all' | 'ongoing' | 'completed' | 'alert'
type SortKey = 'date_desc' | 'date_asc' | 'km_desc' | 'duration_desc'

export default function TripHistoryPage() {
  // ── Dados reais da API ────────────────────────────────────────────────────
  const [trips, setTrips]       = useState<Trip[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const tripsRes = await tripsApi.list({ limit: 500 })
      setTrips(tripsRes.trips)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchData() }, [])

  // Computa a lista de veículos únicos a partir das viagens reais carregadas
  const vehicles = useMemo(() => {
    const map = new Map<string, { id: string; licensePlate: string; brand: string; model: string }>()
    for (const trip of trips) {
      if (trip.vehicle && !map.has(trip.vehicle.id)) {
        map.set(trip.vehicle.id, {
          id: trip.vehicle.id,
          licensePlate: trip.vehicle.licensePlate,
          brand: trip.vehicle.brand,
          model: trip.vehicle.model,
        })
      }
    }
    return Array.from(map.values())
  }, [trips])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('all')
  const [sortKey, setSortKey]         = useState<SortKey>('date_desc')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [detailTrip, setDetailTrip]   = useState<Trip | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const kpis = useMemo(() => buildKpis(trips), [trips])

  // ── Filtros + ordenação ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...trips]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.vehicle.licensePlate.toLowerCase().includes(q) ||
        t.vehicle.model.toLowerCase().includes(q) ||
        t.vehicle.brand.toLowerCase().includes(q) ||
        (t.driverEmployee?.fullName ?? '').toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        (t.purpose ?? '').toLowerCase().includes(q)
      )
    }

    if (filterVehicle !== 'all') list = list.filter(t => t.vehicle.id === filterVehicle)

    if (filterStatus === 'ongoing')   list = list.filter(t => isOngoing(t))
    if (filterStatus === 'completed') list = list.filter(t => !isOngoing(t))
    if (filterStatus === 'alert')     list = list.filter(t => t.maintenanceAlertActive)

    list.sort((a, b) => {
      if (sortKey === 'date_desc') return new Date(b.departureDateTime).getTime() - new Date(a.departureDateTime).getTime()
      if (sortKey === 'date_asc')  return new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime()
      if (sortKey === 'km_desc')   return (b.distanceTraveled ?? 0) - (a.distanceTraveled ?? 0)
      if (sortKey === 'duration_desc') {
        const durA = a.arrivalDateTime ? new Date(a.arrivalDateTime).getTime() - new Date(a.departureDateTime).getTime() : 0
        const durB = b.arrivalDateTime ? new Date(b.arrivalDateTime).getTime() - new Date(b.departureDateTime).getTime() : 0
        return durB - durA
      }
      return 0
    })

    return list
  }, [trips, search, filterVehicle, filterStatus, sortKey])

  const activeFiltersCount = [
    filterVehicle !== 'all',
    filterStatus  !== 'all',
    sortKey       !== 'date_desc',
  ].filter(Boolean).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Route className="text-[#00475B]" size={26} />
            Histórico de Viagens
          </h1>
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00475B] transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Registro completo de deslocamentos da frota com rastreamento de quilometragem e motoristas.
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Erro ao carregar viagens</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
          <button onClick={() => void fetchData()} className="text-xs font-medium text-red-600 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && trips.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-12 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-5 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</span>
            <Car size={16} className="text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
          <p className="text-xs text-gray-400 mt-0.5">viagens registradas</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Andamento</span>
            <Navigation size={16} className="text-blue-300" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{kpis.ongoing}</p>
          <p className="text-xs text-blue-400 mt-0.5">em curso agora</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">KM Total</span>
            <TrendingUp size={16} className="text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.totalKm.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400 mt-0.5">km percorridos</p>
        </div>

        <div className={cn(
          'rounded-2xl border p-4 shadow-sm',
          kpis.withAlert > 0 ? 'border-red-100 bg-red-50/50' : 'border-gray-100 bg-white'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-semibold uppercase tracking-wider', kpis.withAlert > 0 ? 'text-red-400' : 'text-gray-400')}>
              Alertas
            </span>
            <AlertTriangle size={16} className={kpis.withAlert > 0 ? 'text-red-300' : 'text-gray-300'} />
          </div>
          <p className={cn('text-2xl font-bold', kpis.withAlert > 0 ? 'text-red-700' : 'text-gray-900')}>
            {kpis.withAlert}
          </p>
          <p className={cn('text-xs mt-0.5', kpis.withAlert > 0 ? 'text-red-400' : 'text-gray-400')}>
            com alerta de manutenção
          </p>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {/* Busca */}
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por placa, motorista, origem, destino..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Botão filtros */}
          <button
            onClick={() => setShowFilters(o => !o)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors',
              activeFiltersCount > 0 || showFilters
                ? 'border-[#00475B] bg-[#00475B] text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            )}
          >
            <Filter size={15} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Veículo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Car size={11} /> Veículo
                </label>
                <select
                  value={filterVehicle}
                  onChange={e => setFilterVehicle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                >
                  <option value="all">Todos os veículos</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} — {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={11} /> Status
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                >
                  <option value="all">Todos os status</option>
                  <option value="ongoing">Em andamento</option>
                  <option value="completed">Concluídas</option>
                  <option value="alert">Com alerta de manutenção</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={11} /> Ordenar por
                </label>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                >
                  <option value="date_desc">Mais recentes primeiro</option>
                  <option value="date_asc">Mais antigas primeiro</option>
                  <option value="km_desc">Maior distância</option>
                  <option value="duration_desc">Maior duração</option>
                </select>
              </div>
            </div>

            {/* Limpar filtros */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setFilterVehicle('all'); setFilterStatus('all'); setSortKey('date_desc') }}
                className="text-xs text-[#00475B] font-semibold hover:underline flex items-center gap-1"
              >
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{filtered.length}</span> viagem(ns) encontrada(s)
        </p>
        <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <Download size={13} />
          Exportar
        </button>
      </div>

      {/* Lista de viagens */}
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl py-20 text-center">
          <Route className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-sm font-semibold text-gray-500">Nenhuma viagem registrada no momento.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <Route className="mx-auto text-gray-300 mb-3" size={36} />
          <p className="text-sm text-gray-400 font-medium">Nenhuma viagem encontrada</p>
          <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou tente outra busca</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(trip => {
            const dep = formatDateTime(trip.departureDateTime)
            const ongoing = isOngoing(trip)
            const isExpanded = expandedId === trip.id

            return (
              <div
                key={trip.id}
                className={cn(
                  'rounded-2xl border bg-white shadow-sm overflow-hidden transition-all',
                  ongoing
                    ? 'border-blue-200 ring-1 ring-blue-100'
                    : trip.maintenanceAlertActive
                      ? 'border-red-200'
                      : 'border-gray-200'
                )}
              >
                {/* Linha principal */}
                <div className="flex items-center gap-3 px-4 py-3">

                  {/* Data */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase">{dep.dayName}</p>
                    <p className="text-lg font-black text-gray-800 leading-none">{dep.date.slice(0, 2)}</p>
                    <p className="text-xs text-gray-400">{dep.date.slice(3, 10)}</p>
                  </div>

                  <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-gray-800">
                        {trip.vehicle.licensePlate}
                      </span>
                      <span className="text-xs text-gray-400">
                        {trip.vehicle.brand} {trip.vehicle.model}
                      </span>
                      <TripStatusBadge trip={trip} />
                    </div>
                    {/* Rota resumida */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                      <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{trip.origin.split('—')[0]?.trim()}</span>
                      <ArrowRight size={10} className="text-gray-300 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{trip.destination.split('—')[0]?.trim()}</span>
                    </div>
                    {/* Motorista */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={10} className="text-gray-300" />
                      <span className="text-xs text-gray-400 truncate">{trip.driverEmployee?.fullName ?? '—'}</span>
                    </div>
                  </div>

                  {/* Métricas direita */}
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800">
                      {trip.distanceTraveled != null
                        ? `${trip.distanceTraveled.toLocaleString('pt-BR')} km`
                        : <span className="text-gray-300">—</span>
                      }
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDuration(trip.departureDateTime, trip.arrivalDateTime)}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    <button
                      onClick={() => setDetailTrip(trip)}
                      title="Ver detalhes"
                      className="p-2 rounded-lg hover:bg-[#00475B]/10 text-[#00475B] transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Linha expandida */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin size={10}/>Origem</p>
                      <p className="text-xs font-medium text-gray-700 leading-snug">{trip.origin}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin size={10}/>Destino</p>
                      <p className="text-xs font-medium text-gray-700 leading-snug">{trip.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Clock size={10}/>Horário</p>
                      <p className="text-xs font-medium text-gray-700">
                        {dep.time}
                        {trip.arrivalDateTime && (
                          <> → {formatDateTime(trip.arrivalDateTime).time}</>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Gauge size={10}/>Odômetro</p>
                      <p className="text-xs font-medium text-gray-700">
                        {trip.initialKm.toLocaleString('pt-BR')}
                        {trip.finalKm != null && <> → {trip.finalKm.toLocaleString('pt-BR')} km</>}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Navigation size={10}/>Finalidade</p>
                      <p className="text-xs font-medium text-gray-700">{trip.purpose}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de detalhe */}
      {detailTrip && (
        <TripDetailModal trip={detailTrip} onClose={() => setDetailTrip(null)} />
      )}
    </div>
  )
}
