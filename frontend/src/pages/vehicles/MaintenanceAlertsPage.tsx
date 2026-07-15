// src/pages/vehicles/MaintenanceAlertsPage.tsx
// Painel de alertas de manutenção preventiva — um alerta por TIPO DE SERVIÇO,
// independente por veículo. Totalmente integrado ao backend.

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  Car,
  User,
  Filter,
  Wrench,
  CheckCircle2,
  Gauge,
  Calendar,
  CheckCheck,
  X,
  RefreshCw,
  ShieldCheck,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  vehiclesApi,
  maintenanceApi,
  type ApiVehicle,
  type ApiMaintenanceAlert,
} from '@/lib/api'

// ── Helpers locais para formatação ─────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00') // evita offset de timezone
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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
  alert: ApiMaintenanceAlert
  currentKm: number
  onConfirm: (
    serviceKm: number,
    serviceDate: string,
    serviceProvider: string,
    serviceWarranty: string,
    serviceCost: number | null,
    serviceNotes: string
  ) => void
  onClose: () => void
}) {
  const [km, setKm] = useState(String(currentKm))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [provider, setProvider] = useState('')
  const [warranty, setWarranty] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Registrar Serviço</h3>
            <p className="text-sm text-gray-500 mt-0.5">{alert.name}</p>
            <p className="text-xs text-gray-400">{alert.licensePlate} — {alert.vehicleBrand} {alert.vehicleModel}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold text-gray-500">KM do veículo no momento do serviço *</label>
            <div className="relative mt-1">
              <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={km}
                onChange={e => setKm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Data do serviço *</label>
            <div className="relative mt-1">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Nome do Fornecedor</label>
            <div className="relative mt-1">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: Auto Mecânica Silva"
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Prazo de Garantia</label>
            <div className="relative mt-1">
              <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: 90 dias / 6 meses"
                value={warranty}
                onChange={e => setWarranty(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Valor do Serviço (R$)</label>
            <div className="relative mt-1">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 450,00"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Detalhes Adicionais</label>
            <div className="relative mt-1">
              <textarea
                placeholder="Observações adicionais..."
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm(Number(km), date, provider, warranty, cost ? Number(cost) : null, notes)}
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
  alert: ApiMaintenanceAlert
  onRegisterService: (alert: ApiMaintenanceAlert) => void
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
            <p className="text-[10px] text-gray-400 truncate">{alert.vehicleBrand} {alert.vehicleModel}</p>
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
      {(alert.lastServiceKm !== null || alert.lastServiceDate !== null) && (
        <div className="border-t border-gray-100 pt-2 mb-2 text-left space-y-1">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Wrench size={10} />
            <span className="font-semibold">Último serviço:</span>
            {alert.lastServiceKm !== null && <span>{alert.lastServiceKm.toLocaleString('pt-BR')} km</span>}
            {alert.lastServiceDate !== null && <span>· {formatDate(alert.lastServiceDate)}</span>}
          </p>
          {(alert.lastServiceProvider || alert.lastServiceWarranty || alert.lastServiceCost !== null || alert.lastServiceNotes) && (
            <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100 grid grid-cols-2 gap-1.5 text-[9px] text-gray-500 mt-1">
              {alert.lastServiceProvider && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="font-semibold text-gray-400">Fornecedor:</span> {alert.lastServiceProvider}
                </div>
              )}
              {alert.lastServiceWarranty && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="font-semibold text-gray-400">Garantia:</span> {alert.lastServiceWarranty}
                </div>
              )}
              {alert.lastServiceCost !== null && alert.lastServiceCost !== undefined && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="font-semibold text-gray-400">Valor:</span> R$ {Number(alert.lastServiceCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {alert.lastServiceNotes && (
                <div className="col-span-2">
                  <span className="font-semibold text-gray-400">Obs:</span> {alert.lastServiceNotes}
                </div>
              )}
            </div>
          )}
        </div>
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

// ── Página principal ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'needs-service' | 'critical' | 'ok'

export default function MaintenanceAlertsPage() {
  const [filter, setFilter]           = useState<FilterType>('all')
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [serviceModal, setServiceModal] = useState<ApiMaintenanceAlert | null>(null)

  // Estados reais carregados do backend
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([])
  const [alerts, setAlerts]     = useState<ApiMaintenanceAlert[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [vehiclesRes, alertsRes] = await Promise.all([
        vehiclesApi.list(),
        maintenanceApi.listAllAlerts(),
      ])
      setVehicles(vehiclesRes.vehicles)
      setAlerts(alertsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de manutenção.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Aplicar filtros nos alertas
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (vehicleFilter !== 'all' && a.vehicleId !== vehicleFilter) return false
      if (filter === 'needs-service') return a.urgency !== 'ok'
      if (filter === 'critical')      return a.urgency === 'critical' || a.urgency === 'high'
      if (filter === 'ok')            return a.urgency === 'ok'
      return true
    })
  }, [alerts, filter, vehicleFilter])

  // KPIs
  const criticalCount = useMemo(() => alerts.filter(a => a.urgency === 'critical' || a.urgency === 'high').length, [alerts])
  const overdueKmCount = useMemo(() => alerts.filter(a => a.kmRemaining !== null && a.kmRemaining < 0).length, [alerts])

  // Confirmar registro de serviço realizado
  const handleRegisterService = useCallback(async (
    serviceKm: number,
    serviceDate: string,
    serviceProvider: string,
    serviceWarranty: string,
    serviceCost: number | null,
    serviceNotes: string
  ) => {
    if (!serviceModal) return
    setLoading(true)
    setError(null)
    try {
      await maintenanceApi.completeService(
        serviceModal.vehicleId,
        serviceModal.maintenanceTypeId,
        {
          serviceKm,
          serviceDate,
          serviceProvider: serviceProvider || null,
          serviceWarranty: serviceWarranty || null,
          serviceCost: serviceCost !== null ? serviceCost : null,
          serviceNotes: serviceNotes || null,
        }
      )
      setServiceModal(null)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar serviço realizado.')
    } finally {
      setLoading(false)
    }
  }, [serviceModal, fetchData])

  const filterButtons: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all',           label: 'Todos',          count: alerts.length },
    { id: 'needs-service', label: 'Requer Atenção' },
    { id: 'critical',      label: '🔴 Críticos',    count: criticalCount },
    { id: 'ok',            label: '✅ Em dia' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Alertas de Manutenção</h1>
              <p className="text-gray-500 text-sm">Monitoramento preventivo por tipo de serviço</p>
            </div>
          </div>
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

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-gray-900">{alerts.length}</p>
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

      {/* Erro */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Erro na operação</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold text-red-600 hover:underline">
            Dispensar
          </button>
        </div>
      )}

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
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && alerts.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-gray-150 bg-white p-4 animate-pulse h-48" />
          ))}
        </div>
      )}

      {/* Grid de alertas — 1 card por tipo de manutenção */}
      {!loading && filteredAlerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
