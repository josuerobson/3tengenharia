// src/pages/vehicles/MaintenanceAlertsPage.tsx
// Painel de alertas de manutenção preventiva — um alerta por TIPO DE SERVIÇO,
// independente por veículo. Ex: o mesmo veículo pode ter "óleo vencido" +
// "correia dentada ok" + "pneus em atenção" — todos separados.

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
  CheckCheck,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  MOCK_VEHICLES,
  MOCK_TRIPS,
  MOCK_MAINTENANCE_TYPES,
  computeMaintenanceAlerts,
  formatDateTime,
  formatDate,
  type MaintenanceAlert,
  type VehicleMaintenanceType,
  type Trip,
} from '@/data/mockData'

// ── Configuração de urgência ───────────────────────────────────────────────────

type UrgencyLevel = 'ok' | 'medium' | 'high' | 'critical'

const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string; barColor: string; cardBorder: string; cardBg: string
  badgeVariant: UrgencyLevel; iconColor: string; labelColor: string
}> = {
  ok:       { label: 'Em dia',    barColor: 'bg-emerald-500', cardBorder: 'border-emerald-200', cardBg: 'bg-emerald-50/40',  badgeVariant: 'ok',       iconColor: 'text-emerald-500', labelColor: 'text-emerald-700' },
  medium:   { label: 'Atenção',   barColor: 'bg-amber-400',   cardBorder: 'border-amber-200',   cardBg: 'bg-amber-50/40',    badgeVariant: 'medium',   iconColor: 'text-amber-500',   labelColor: 'text-amber-700' },
  high:     { label: 'Urgente',   barColor: 'bg-orange-500',  cardBorder: 'border-orange-200',  cardBg: 'bg-orange-50/40',   badgeVariant: 'high',     iconColor: 'text-orange-500',  labelColor: 'text-orange-700' },
  critical: { label: 'Crítico',   barColor: 'bg-red-500',     cardBorder: 'border-red-200',     cardBg: 'bg-red-50/50',      badgeVariant: 'critical', iconColor: 'text-red-500',     labelColor: 'text-red-700' },
}

// ── Modal: Registrar Serviço ───────────────────────────────────────────────────

function RegisterServiceModal({
  alert,
  currentKm,
  onConfirm,
  onClose,
}: {
  alert: MaintenanceAlert
  currentKm: number
  onConfirm: (serviceKm: number, serviceDate: string) => void
  onClose: () => void
}) {
  const [km, setKm] = useState(String(currentKm))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Registrar Serviço</h3>
            <p className="text-sm text-gray-500 mt-0.5">{alert.name}</p>
            <p className="text-xs text-gray-400">{alert.licensePlate} — {alert.vehicleBrand}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">KM do veículo no momento do serviço</label>
            <div className="relative mt-1">
              <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={km}
                onChange={e => setKm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Data do serviço</label>
            <div className="relative mt-1">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm(Number(km), date)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-2.5 text-sm font-semibold hover:bg-[#003d4f] transition-colors"
          >
            <CheckCheck size={16} /> Confirmar Serviço
          </button>
          <button onClick={onClose} className="px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de alerta individual (1 por tipo de manutenção) ──────────────────────

function AlertCard({
  alert,
  onRegisterService,
}: {
  alert: MaintenanceAlert
  onRegisterService: (alert: MaintenanceAlert) => void
}) {
  const cfg = URGENCY_CONFIG[alert.urgency]

  // Percentual de progresso para a barra
  const pct = useMemo(() => {
    if (alert.intervalKm && alert.lastServiceKm !== null) {
      const ridden = alert.currentKm - alert.lastServiceKm
      return Math.min(100, Math.max(0, (ridden / alert.intervalKm) * 100))
    }
    return 0
  }, [alert])

  const dueAtKm = alert.intervalKm && alert.lastServiceKm !== null
    ? alert.lastServiceKm + alert.intervalKm
    : null

  return (
    <div className={cn(
      'rounded-2xl border-2 bg-white shadow-sm p-4 transition-all',
      cfg.cardBorder, cfg.cardBg,
    )}>
      {/* Cabeçalho — veículo */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            alert.urgency === 'critical' ? 'bg-red-100' : alert.urgency === 'high' ? 'bg-orange-100' : alert.urgency === 'medium' ? 'bg-amber-100' : 'bg-emerald-100')}>
            <Car size={14} className={cfg.iconColor} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-xs tracking-wider">{alert.licensePlate}</p>
            <p className="text-[10px] text-gray-400 truncate">{alert.vehicleBrand}</p>
          </div>
        </div>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', cfg.cardBorder, cfg.labelColor, 'border bg-white/70')}>
          {cfg.label}
        </span>
      </div>

      {/* Tipo de serviço */}
      <p className="font-bold text-gray-900 text-sm mb-0.5">{alert.name}</p>
      {alert.description && <p className="text-xs text-gray-500 mb-3">{alert.description}</p>}

      {/* Barra de progresso */}
      {alert.intervalKm && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>KM rodados desde o serviço</span>
            <span className={cn('font-bold', cfg.labelColor)}>{Math.round(pct)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700', cfg.barColor)} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <Metric
          label="KM Atual"
          value={alert.currentKm.toLocaleString('pt-BR')}
          unit="km"
        />
        {dueAtKm !== null ? (
          <Metric
            label="Vence em"
            value={dueAtKm.toLocaleString('pt-BR')}
            unit="km"
            highlight={alert.urgency === 'high' || alert.urgency === 'critical'}
          />
        ) : <div />}
        {alert.kmRemaining !== null ? (
          <Metric
            label={alert.kmRemaining >= 0 ? 'Faltam' : 'Vencido há'}
            value={Math.abs(alert.kmRemaining).toLocaleString('pt-BR')}
            unit="km"
            highlight={alert.kmRemaining < 0}
            overdue={alert.kmRemaining < 0}
          />
        ) : alert.daysRemaining !== null ? (
          <Metric
            label={alert.daysRemaining >= 0 ? 'Faltam' : 'Vencido há'}
            value={String(Math.abs(alert.daysRemaining))}
            unit="dias"
            highlight={alert.daysRemaining < 0}
            overdue={alert.daysRemaining < 0}
          />
        ) : <div />}
      </div>

      {/* Último serviço */}
      {(alert.lastServiceKm || alert.lastServiceDate) && (
        <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-2 mb-2 flex items-center gap-1">
          <Wrench size={10} />
          Último serviço:
          {alert.lastServiceKm && <span>{alert.lastServiceKm.toLocaleString('pt-BR')} km</span>}
          {alert.lastServiceDate && <span>· {formatDate(alert.lastServiceDate)}</span>}
        </p>
      )}

      {/* Botão registrar */}
      {(alert.urgency === 'high' || alert.urgency === 'critical' || alert.urgency === 'medium') && (
        <button
          onClick={() => onRegisterService(alert)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          <CheckCheck size={12} /> Registrar Serviço Realizado
        </button>
      )}
    </div>
  )
}

function Metric({ label, value, unit, highlight = false, overdue = false }: {
  label: string; value: string; unit: string; highlight?: boolean; overdue?: boolean
}) {
  return (
    <div className="bg-white/70 rounded-xl py-2 px-1">
      <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">{label}</p>
      <p className={cn('text-sm font-extrabold tabular-nums', overdue ? 'text-red-600' : highlight ? 'text-orange-600' : 'text-gray-800')}>{value}</p>
      <p className="text-[9px] text-gray-400">{unit}</p>
    </div>
  )
}

// ── Item da linha do tempo de viagens ─────────────────────────────────────────

function TimelineItem({ trip, isLast }: { trip: Trip; isLast: boolean }) {
  const isOngoing = trip.arrivalDateTime === null
  const initials = trip.driverName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0',
          isOngoing ? 'bg-[#FF8C00] ring-2 ring-[#FF8C00]/30' : 'bg-[#00475B]')}>
          {initials}
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-100 mt-2 min-h-[24px]" />}
      </div>
      <div className={cn('flex-1 bg-white rounded-2xl border shadow-sm p-4 mb-4',
        isOngoing ? 'border-[#FF8C00]/30' : 'border-gray-100',
        trip.maintenanceAlertActive && 'border-amber-200')}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{trip.vehicle.licensePlate}</p>
              <span className="text-gray-400 text-xs">·</span>
              <p className="text-xs text-gray-500">{trip.vehicle.brand} {trip.vehicle.model}</p>
              {isOngoing && <Badge variant="accent" dot>Em viagem</Badge>}
              {trip.maintenanceAlertActive && <Badge variant="high" dot>Alerta KM</Badge>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User size={11} />{trip.driverName} <span className="text-gray-300">·</span> {trip.driverRegistration}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
        </div>
        <div className="flex items-start gap-2 mb-3">
          <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
            <MapPin size={12} className="text-[#00475B]" />
            <div className="w-px h-3 bg-gray-200" />
            <Navigation size={12} className="text-[#FF8C00]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{trip.origin}</p>
            <p className="text-xs font-medium text-gray-700 truncate mt-1">{trip.destination}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock size={12} />{formatDateTime(trip.departureDateTime)}</span>
          {trip.arrivalDateTime && (
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" />
              {new Date(trip.arrivalDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {trip.distanceTraveled !== null && (
            <span className="flex items-center gap-1"><Gauge size={12} />{trip.distanceTraveled.toLocaleString('pt-BR')} km rodados</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'needs-service' | 'critical' | 'ok'

export default function MaintenanceAlertsPage() {
  const [filter, setFilter]           = useState<FilterType>('all')
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [auditVehicleFilter, setAuditVehicleFilter] = useState<string>('all')
  const [serviceModal, setServiceModal] = useState<MaintenanceAlert | null>(null)

  // Mock state — em produção viria da API
  const [maintenanceTypes, setMaintenanceTypes] = useState<VehicleMaintenanceType[]>(MOCK_MAINTENANCE_TYPES)

  // Todos os alertas computados para todos os veículos
  const allAlerts = useMemo(() => {
    return MOCK_VEHICLES.flatMap(vehicle => {
      const types = maintenanceTypes.filter(t => t.vehicleId === vehicle.id)
      return computeMaintenanceAlerts(vehicle, types)
    })
  }, [maintenanceTypes])

  // Aplicar filtros
  const filteredAlerts = useMemo(() => {
    return allAlerts
      .filter(a => {
        if (vehicleFilter !== 'all' && a.vehicleId !== vehicleFilter) return false
        if (filter === 'needs-service') return a.urgency !== 'ok'
        if (filter === 'critical')      return a.urgency === 'critical' || a.urgency === 'high'
        if (filter === 'ok')            return a.urgency === 'ok'
        return true
      })
  }, [allAlerts, filter, vehicleFilter])

  // KPIs
  const criticalCount = useMemo(() => allAlerts.filter(a => a.urgency === 'critical' || a.urgency === 'high').length, [allAlerts])
  const overdueKmCount = useMemo(() => allAlerts.filter(a => a.kmRemaining !== null && a.kmRemaining < 0).length, [allAlerts])

  // Viagens filtradas
  const filteredTrips = useMemo(() => {
    const base = [...MOCK_TRIPS].sort(
      (a, b) => new Date(b.departureDateTime).getTime() - new Date(a.departureDateTime).getTime(),
    )
    if (auditVehicleFilter === 'all') return base
    return base.filter(t => t.vehicleId === auditVehicleFilter)
  }, [auditVehicleFilter])

  function handleRegisterService(serviceKm: number, serviceDate: string) {
    if (!serviceModal) return
    setMaintenanceTypes(prev => prev.map(t =>
      t.id === serviceModal.maintenanceTypeId
        ? { ...t, lastServiceKm: serviceKm, lastServiceDate: serviceDate }
        : t,
    ))
    setServiceModal(null)
  }

  const filterButtons: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all',           label: 'Todos',          count: allAlerts.length },
    { id: 'needs-service', label: 'Requer Atenção' },
    { id: 'critical',      label: '🔴 Críticos',    count: criticalCount },
    { id: 'ok',            label: '✅ Em dia' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Alertas de Manutenção</h1>
            <p className="text-gray-500 text-sm">Monitoramento preventivo por tipo de serviço</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-gray-900">{allAlerts.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Serviços monitorados</p>
          </div>
          <div className={cn('rounded-2xl border p-4 text-center shadow-sm', criticalCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white')}>
            <p className={cn('text-2xl font-extrabold', criticalCount > 0 ? 'text-red-600' : 'text-gray-900')}>{criticalCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Urgentes ou críticos</p>
          </div>
          <div className={cn('rounded-2xl border p-4 text-center shadow-sm hidden sm:block', overdueKmCount > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white')}>
            <p className={cn('text-2xl font-extrabold', overdueKmCount > 0 ? 'text-orange-600' : 'text-gray-900')}>{overdueKmCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Vencidos por km</p>
          </div>
        </div>
      </div>

      {/* Filtros de urgência */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={16} className="text-gray-400" />
        {filterButtons.map(btn => (
          <button key={btn.id} onClick={() => setFilter(btn.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border',
              filter === btn.id
                ? 'bg-[#00475B] text-white border-[#00475B] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#00475B]/40 hover:text-[#00475B]')}>
            {btn.label}
            {btn.count !== undefined && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                filter === btn.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
                {btn.count}
              </span>
            )}
          </button>
        ))}

        {/* Filtro por veículo */}
        <div className="ml-auto flex items-center gap-1.5">
          <Car size={14} className="text-gray-400" />
          <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
            className="text-sm rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00475B]/30">
            <option value="all">Todos os veículos</option>
            {MOCK_VEHICLES.map(v => (
              <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de alertas — 1 card por tipo de manutenção */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">Nenhum alerta para este filtro</p>
          <p className="text-gray-400 text-sm mt-1">Toda a frota está em dia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map(alert => (
            <AlertCard
              key={alert.maintenanceTypeId}
              alert={alert}
              onRegisterService={setServiceModal}
            />
          ))}
        </div>
      )}

      {/* Linha do Tempo de Viagens */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Linha do Tempo de Viagens</h2>
            <p className="text-sm text-gray-500">Auditoria de uso da frota — datas, motoristas e rotas</p>
          </div>
          <div className="flex items-center gap-2">
            <Car size={15} className="text-gray-400" />
            <select value={auditVehicleFilter} onChange={e => setAuditVehicleFilter(e.target.value)}
              className="h-9 pl-3 pr-8 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00475B]/30 text-gray-700 font-medium">
              <option value="all">Todos os veículos</option>
              {MOCK_VEHICLES.map(v => (
                <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>
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
              <TimelineItem key={trip.id} trip={trip} isLast={idx === filteredTrips.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Modal de registro de serviço */}
      {serviceModal && (
        <RegisterServiceModal
          alert={serviceModal}
          currentKm={serviceModal.currentKm}
          onConfirm={handleRegisterService}
          onClose={() => setServiceModal(null)}
        />
      )}
    </div>
  )
}
