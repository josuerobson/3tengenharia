// src/pages/vehicles/MaintenanceAlertsPage.tsx
// Painel de alertas de manutenção preventiva + linha do tempo de auditoria de viagens.

import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  User,
  Filter,
  ChevronRight,
  Wrench,
  CheckCircle2,
  Navigation,
  Gauge,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, VEHICLE_STATUS_BADGE } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MOCK_VEHICLES,
  MOCK_TRIPS,
  getVehicleMaintenanceInfo,
  formatDateTime,
  formatDate,
  type Vehicle,
  type Trip,
} from '@/data/mockData'

// ── Tipos locais ──────────────────────────────────────────────────────────────

type UrgencyLevel = 'ok' | 'medium' | 'high' | 'critical'

const URGENCY_CONFIG: Record<
  UrgencyLevel,
  {
    label: string
    barColor: string
    cardBorder: string
    cardBg: string
    badgeVariant: 'ok' | 'medium' | 'high' | 'critical'
    icon: React.ElementType
    iconColor: string
  }
> = {
  ok: {
    label: 'Em dia',
    barColor: 'bg-emerald-500',
    cardBorder: 'border-emerald-200',
    cardBg: 'bg-emerald-50/50',
    badgeVariant: 'ok',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  medium: {
    label: 'Atenção',
    barColor: 'bg-amber-400',
    cardBorder: 'border-amber-200',
    cardBg: 'bg-amber-50/50',
    badgeVariant: 'medium',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  high: {
    label: 'Urgente',
    barColor: 'bg-orange-500',
    cardBorder: 'border-orange-200',
    cardBg: 'bg-orange-50/50',
    badgeVariant: 'high',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  critical: {
    label: 'Crítico',
    barColor: 'bg-red-500',
    cardBorder: 'border-red-200',
    cardBg: 'bg-red-50/60',
    badgeVariant: 'critical',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
  },
}

// ── Card de alerta de veículo ─────────────────────────────────────────────────

function MaintenanceAlertCard({ vehicle }: { vehicle: Vehicle }) {
  const { kmSinceLast, percentage, urgency } = getVehicleMaintenanceInfo(vehicle)
  const config = URGENCY_CONFIG[urgency]
  const StatusIcon = config.icon
  const vehicleBadge = VEHICLE_STATUS_BADGE[vehicle.status]

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border-2 shadow-card p-5',
        'transition-all duration-150 hover:shadow-card-hover',
        config.cardBorder,
      )}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              urgency === 'critical' || urgency === 'high'
                ? 'bg-red-100'
                : urgency === 'medium'
                  ? 'bg-amber-100'
                  : 'bg-emerald-100',
            )}
          >
            <Car
              size={22}
              className={cn(
                urgency === 'critical' || urgency === 'high'
                  ? 'text-red-500'
                  : urgency === 'medium'
                    ? 'text-amber-500'
                    : 'text-emerald-500',
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-gray-900 text-base">
                {vehicle.licensePlate}
              </p>
              <Badge variant={vehicleBadge.variant} dot>
                {vehicleBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {vehicle.brand} {vehicle.model} · {vehicle.year}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end flex-shrink-0 gap-1">
          <Badge variant={config.badgeVariant} dot>
            {config.label}
          </Badge>
          <StatusIcon size={18} className={config.iconColor} />
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500">
            Progresso até manutenção
          </span>
          <span
            className={cn(
              'text-xs font-bold tabular-nums',
              urgency === 'critical'
                ? 'text-red-600'
                : urgency === 'high'
                  ? 'text-orange-600'
                  : urgency === 'medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600',
            )}
          >
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', config.barColor)}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCell
          label="KM Atual"
          value={vehicle.currentKm.toLocaleString('pt-BR')}
          unit="km"
        />
        <MetricCell
          label="Desde Últ. Serviço"
          value={kmSinceLast.toLocaleString('pt-BR')}
          unit="km"
          highlight={urgency === 'high' || urgency === 'critical'}
        />
        <MetricCell
          label="Limiar"
          value={(vehicle.maintenanceKmThreshold ?? 0).toLocaleString('pt-BR')}
          unit="km"
        />
      </div>

      {/* Última manutenção */}
      {vehicle.lastMaintenanceDate && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar size={12} />
          Última manutenção: {formatDate(vehicle.lastMaintenanceDate)}
        </div>
      )}

      {/* Ação */}
      {(urgency === 'high' || urgency === 'critical') && (
        <Button variant="outline" size="sm" className="w-full mt-4 gap-2">
          <Wrench size={14} />
          Agendar Manutenção
        </Button>
      )}
    </div>
  )
}

function MetricCell({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string
  value: string
  unit: string
  highlight?: boolean
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-1">
        {label}
      </p>
      <p
        className={cn(
          'text-sm font-extrabold tabular-nums leading-tight',
          highlight ? 'text-red-600' : 'text-gray-800',
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{unit}</p>
    </div>
  )
}

// ── Item da linha do tempo ────────────────────────────────────────────────────

function TimelineItem({ trip, isLast }: { trip: Trip; isLast: boolean }) {
  const isOngoing = trip.arrivalDateTime === null

  const driverInitials = trip.driverName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex gap-4">
      {/* Coluna de linha + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0',
            isOngoing ? 'bg-brand-accent ring-2 ring-brand-accent/30' : 'bg-brand-primary',
          )}
        >
          {driverInitials}
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-100 mt-2 min-h-[24px]" />}
      </div>

      {/* Conteúdo */}
      <div
        className={cn(
          'flex-1 bg-white rounded-2xl border shadow-card p-4 mb-4',
          isOngoing ? 'border-brand-accent/30' : 'border-gray-100',
          trip.maintenanceAlertActive && 'border-amber-200',
        )}
      >
        {/* Linha superior */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">
                {trip.vehicle.licensePlate}
              </p>
              <span className="text-gray-400 text-xs">·</span>
              <p className="text-xs text-gray-500">
                {trip.vehicle.brand} {trip.vehicle.model}
              </p>
              {isOngoing && (
                <Badge variant="accent" dot>
                  Em viagem
                </Badge>
              )}
              {trip.maintenanceAlertActive && (
                <Badge variant="high" dot>
                  Alerta KM
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User size={11} />
              {trip.driverName}
              <span className="text-gray-300">·</span>
              {trip.driverRegistration}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
        </div>

        {/* Rota */}
        <div className="flex items-start gap-2 mb-3">
          <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
            <MapPin size={12} className="text-brand-primary" />
            <div className="w-px h-3 bg-gray-200" />
            <Navigation size={12} className="text-brand-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{trip.origin}</p>
            <p className="text-xs font-medium text-gray-700 truncate mt-1">{trip.destination}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={12} />
            {formatDateTime(trip.departureDateTime)}
          </div>
          {trip.arrivalDateTime && (
            <div className="flex items-center gap-1 text-gray-500">
              <CheckCircle2 size={12} className="text-emerald-500" />
              {trip.arrivalDateTime
                ? new Date(trip.arrivalDateTime).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </div>
          )}
          {trip.distanceTraveled !== null && (
            <div className="flex items-center gap-1 text-gray-500">
              <Gauge size={12} />
              {trip.distanceTraveled.toLocaleString('pt-BR')} km rodados
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

type FilterType = 'all' | 'needs-service' | 'critical' | 'ok'

export default function MaintenanceAlertsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [auditVehicleFilter, setAuditVehicleFilter] = useState<string>('all')

  // Veículos filtrados e ordenados por urgência (crítico → alto → médio → ok)
  const sortedVehicles = useMemo(() => {
    const urgencyOrder: Record<UrgencyLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      ok: 3,
    }

    return [...MOCK_VEHICLES]
      .map((v) => ({ vehicle: v, info: getVehicleMaintenanceInfo(v) }))
      .filter(({ info }) => {
        if (filter === 'needs-service') return info.urgency !== 'ok'
        if (filter === 'critical') return info.urgency === 'critical' || info.urgency === 'high'
        if (filter === 'ok') return info.urgency === 'ok'
        return true
      })
      .sort((a, b) => urgencyOrder[a.info.urgency] - urgencyOrder[b.info.urgency])
  }, [filter])

  // Viagens filtradas por veículo, ordenadas cronologicamente
  const filteredTrips = useMemo(() => {
    const base = [...MOCK_TRIPS].sort(
      (a, b) =>
        new Date(b.departureDateTime).getTime() -
        new Date(a.departureDateTime).getTime(),
    )
    if (auditVehicleFilter === 'all') return base
    return base.filter((t) => t.vehicleId === auditVehicleFilter)
  }, [auditVehicleFilter])

  const criticalCount = useMemo(
    () =>
      MOCK_VEHICLES.filter((v) => {
        const { urgency } = getVehicleMaintenanceInfo(v)
        return urgency === 'critical' || urgency === 'high'
      }).length,
    [],
  )

  const filterButtons: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'Todos', count: MOCK_VEHICLES.length },
    { id: 'needs-service', label: 'Requer Atenção' },
    { id: 'critical', label: '🔴 Críticos', count: criticalCount },
    { id: 'ok', label: '✅ Em dia' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Alertas de Manutenção</h1>
            <p className="text-gray-500 text-sm">Monitoramento preventivo da frota</p>
          </div>
        </div>

        {/* KPI strip */}
        {criticalCount > 0 && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in-up">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              <span className="font-extrabold">{criticalCount} veículo(s)</span> requerem
              manutenção imediata — acima do limiar de KM.
            </p>
          </div>
        )}
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400 self-center" />
        {filterButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold',
              'transition-all duration-150 border',
              filter === btn.id
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary/40 hover:text-brand-primary',
            )}
          >
            {btn.label}
            {btn.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  filter === btn.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Grid de Alertas ────────────────────────────────────────────── */}
      {sortedVehicles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">Nenhum alerta para este filtro</p>
          <p className="text-gray-400 text-sm mt-1">Toda a frota está em dia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedVehicles.map(({ vehicle }) => (
            <MaintenanceAlertCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* ── Linha do Tempo de Auditoria ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Linha do Tempo de Viagens</h2>
            <p className="text-sm text-gray-500">
              Auditoria de uso da frota — datas, motoristas e rotas
            </p>
          </div>

          {/* Filtro por veículo */}
          <div className="flex items-center gap-2">
            <Car size={15} className="text-gray-400" />
            <select
              value={auditVehicleFilter}
              onChange={(e) => setAuditVehicleFilter(e.target.value)}
              className="h-9 pl-3 pr-8 text-sm rounded-xl border border-gray-200
                         bg-white focus:outline-none focus:border-brand-primary
                         focus:ring-1 focus:ring-brand-primary/20 text-gray-700 font-medium"
            >
              <option value="all">Todos os veículos</option>
              {MOCK_VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} — {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">Nenhuma viagem registrada para este filtro</p>
          </div>
        ) : (
          <div>
            {filteredTrips.map((trip, idx) => (
              <TimelineItem
                key={trip.id}
                trip={trip}
                isLast={idx === filteredTrips.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
