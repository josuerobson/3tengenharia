// src/pages/time-logs/ReportPage.tsx
// Painel analítico de relatórios de horas — visão Admin/Gestor.
// KPIs em cards, tabela filtrada por período/obra/funcionário e exportação CSV pura em JS.

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Clock,
  Building2,
  AlertTriangle,
  Download,
  Filter,
  TrendingUp,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  AlertCircle,
  CheckCircle2,
  BarChart2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  SHIFT_TYPE_LABELS,
  type ShiftType,
} from '@/data/mockData'
import {
  assetsApi,
  timeLogsApi,
  type ApiTimeLog,
  type ApiWorksite,
  type ApiEmployee,
} from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TimeLogEntry {
  id: string
  employeeId: string
  employeeName: string
  registration: string
  worksiteId: string
  worksiteName: string
  costCenter: string
  logDate: string // YYYY-MM-DD
  entryTime: string // HH:mm
  exitTime: string // HH:mm
  breakStartTime?: string | null
  breakEndTime?: string | null
  shiftType: ShiftType
  totalHours: number
  overtimeHours: number
  hasInconsistency: boolean
  inconsistencyNote?: string
}

type PeriodFilter = 'TODAY' | 'WEEK' | 'MONTH'
type SortKey = 'logDate' | 'employeeName' | 'worksiteName' | 'totalHours'
type SortDir = 'asc' | 'desc'

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  TODAY: 'Hoje',
  WEEK:  'Esta Semana',
  MONTH: 'Este Mês',
}

function formatTimeToHM(isoStr: string): string {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return ''
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return formatter.format(d)
  } catch (e) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
}

// ── CSV Export (puro JavaScript) ──────────────────────────────────────────────

function exportToCSV(logs: TimeLogEntry[], periodLabel: string): void {
  const headers = [
    'Funcionário',
    'Matrícula',
    'Obra',
    'Centro de Custo',
    'Data',
    'Entrada',
    'Início Intervalo',
    'Fim Intervalo',
    'Saída',
    'Horas Líquidas',
    'Horas Extras',
    'Tipo de Turno',
    'Status',
    'Observação',
  ]

  const rows = logs.map((l) => [
    l.employeeName,
    l.registration,
    l.worksiteName,
    l.costCenter,
    new Date(l.logDate + 'T12:00:00').toLocaleDateString('pt-BR'),
    l.entryTime,
    l.breakStartTime ?? '-',
    l.breakEndTime ?? '-',
    l.exitTime,
    l.totalHours.toFixed(1).replace('.', ','),
    l.overtimeHours.toFixed(1).replace('.', ','),
    SHIFT_TYPE_LABELS[l.shiftType] ?? l.shiftType,
    l.hasInconsistency ? 'INCONSISTÊNCIA' : 'Normal',
    l.inconsistencyNote ?? '',
  ])

  // BOM (\uFEFF) garante que o Excel abra corretamente no Windows com acentos
  const bom = '\uFEFF'
  const content =
    bom +
    [
      headers.map((h) => `"${h}"`).join(';'),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'),
      ),
    ].join('\r\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `3t_rateio_horas_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
  sub?: string
  alert?: boolean
}

function KPICard({ icon: Icon, iconBg, iconColor, label, value, sub, alert }: KPICardProps) {
  return (
    <Card className={cn(
      'p-4 sm:p-5 flex flex-col gap-3 transition-all duration-150 bg-white border border-gray-100 shadow-card hover:shadow-card-hover',
      alert && 'border-red-200 bg-red-50/10',
    )}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-none mb-1">
          {label}
        </p>
        <p className={cn('text-2xl font-extrabold tabular-nums leading-tight', alert ? 'text-red-600' : 'text-gray-900')}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-500 mt-1 leading-snug">{sub}</p>}
      </div>
    </Card>
  )
}

// ── Linha da tabela ───────────────────────────────────────────────────────────

function TableRow({ log, index }: { log: TimeLogEntry; index: number }) {
  const dateLabel = new Date(log.logDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })

  return (
    <tr
      className={cn(
        'border-b border-gray-50 transition-colors duration-100',
        log.hasInconsistency
          ? 'bg-red-50/60 border-l-2 border-l-red-400'
          : index % 2 === 0
            ? 'bg-white hover:bg-slate-50'
            : 'bg-slate-50/50 hover:bg-slate-100/50',
      )}
    >
      {/* Funcionário */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-brand-primary">
              {log.employeeName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
              {log.employeeName}
            </p>
            <p className="text-xs text-gray-400">{log.registration}</p>
          </div>
        </div>
      </td>

      {/* Obra */}
      <td className="px-3 py-3 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{log.worksiteName}</p>
        <p className="text-xs text-gray-400">{log.costCenter}</p>
      </td>

      {/* Data */}
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{dateLabel}</td>

      {/* Entrada / Saída */}
      <td className="px-3 py-3 whitespace-nowrap">
        <p className="text-xs text-gray-500">{log.entryTime} → {log.exitTime}</p>
        {(log.breakStartTime || log.breakEndTime) && (
          <p className="text-[10px] text-gray-400">
            Int: {log.breakStartTime ?? '?'} - {log.breakEndTime ?? '?'}
          </p>
        )}
      </td>

      {/* Horas */}
      <td className="px-3 py-3 whitespace-nowrap">
        <p className="text-sm font-bold text-gray-900 tabular-nums">
          {log.totalHours.toFixed(1).replace('.', ',')}h
        </p>
        {log.overtimeHours > 0 && (
          <p className="text-xs font-semibold text-brand-accent">
            +{log.overtimeHours.toFixed(1).replace('.', ',')}h extra
          </p>
        )}
      </td>

      {/* Turno */}
      <td className="px-3 py-3 whitespace-nowrap">
        <Badge
          variant={log.shiftType === 'OVERTIME' ? 'high' : log.shiftType === 'REGULAR' ? 'ok' : 'default'}
          className="text-[10px]"
        >
          {SHIFT_TYPE_LABELS[log.shiftType]}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        {log.hasInconsistency ? (
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-600">Inconsistência</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-emerald-600">Normal</span>
          </div>
        )}
        {log.hasInconsistency && log.inconsistencyNote && (
          <p className="text-[10px] text-red-500 mt-0.5 max-w-[140px] leading-tight" title={log.inconsistencyNote}>
            {log.inconsistencyNote.slice(0, 45)}{log.inconsistencyNote.length > 45 ? '…' : ''}
          </p>
        )}
      </td>
    </tr>
  )
}

// ── Cabeçalho de coluna ordenável ─────────────────────────────────────────────

interface SortableThProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (k: SortKey) => void
}

function SortableTh({ label, sortKey, currentKey, currentDir, onSort }: SortableThProps) {
  const isActive = currentKey === sortKey
  return (
    <th
      scope="col"
      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-brand-primary transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc'
            ? <ChevronUp size={13} className="text-brand-primary" />
            : <ChevronDownIcon size={13} className="text-brand-primary" />
        ) : (
          <div className="w-3 h-3 opacity-0" />
        )}
      </div>
    </th>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ReportPage() {
  // ── Estados de Dados e Filtro ───────────────────────────────────────────
  const [logs, setLogs] = useState<ApiTimeLog[]>([])
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [period, setPeriod] = useState<PeriodFilter>('MONTH')
  const [worksiteFilter, setWorksiteFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')

  // ── Ordenação ──────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('logDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  // ── Carregar Lançamentos do Banco ──────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)

      const todayObj = new Date()
      const todayStr = todayObj.toISOString().split('T')[0]

      let startDate = ''
      if (period === 'TODAY') {
        startDate = todayStr
      } else if (period === 'WEEK') {
        const weekStart = new Date(todayObj)
        const day = weekStart.getDay()
        const diff = day === 0 ? -6 : 1 - day
        weekStart.setDate(todayObj.getDate() + diff)
        startDate = weekStart.toISOString().split('T')[0]
      } else if (period === 'MONTH') {
        // Início do mês atual
        startDate = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-01`
      }

      const [logList, wList, eList] = await Promise.all([
        timeLogsApi.list({ startDate, endDate: todayStr }),
        assetsApi.listWorksites(),
        assetsApi.listEmployees(),
      ])

      setLogs(logList)
      setWorksites(wList)
      setEmployees(eList)
    } catch (err: any) {
      console.error(err)
      setFetchError(err?.message ?? 'Falha ao buscar lançamentos de horas.')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Conversão de Tipo para Exibição ────────────────────────────────────
  const mappedLogs = useMemo(() => {
    return logs.map((log): TimeLogEntry => {
      const entryTime = formatTimeToHM(log.clockIn)
      const exitTime = formatTimeToHM(log.clockOut)
      const breakStartTime = log.breakStart ? formatTimeToHM(log.breakStart) : null
      const breakEndTime = log.breakEnd ? formatTimeToHM(log.breakEnd) : null
      const totalHours = log.totalMinutesWorked / 60
      const overtimeHours = Math.max(0, totalHours - 8)
      
      // Inconsistência se a jornada for superior a 10h ou se não validada
      const hasInconsistency = totalHours > 10 || !log.isValidated
      const inconsistencyNote = totalHours > 10 
        ? 'Alerta: Jornada superior a 10h líquidas.' 
        : !log.isValidated 
          ? 'Aguardando validação do encarregado.' 
          : ''

      return {
        id: log.id,
        employeeId: log.employeeId,
        employeeName: log.employee.fullName,
        registration: log.employee.registration,
        worksiteId: log.worksiteId,
        worksiteName: log.worksite.name,
        costCenter: log.worksite.code,
        logDate: log.workDate.split('T')[0],
        entryTime,
        exitTime,
        breakStartTime,
        breakEndTime,
        shiftType: log.shiftType,
        totalHours,
        overtimeHours,
        hasInconsistency,
        inconsistencyNote,
      }
    })
  }, [logs])

  // ── Filtragem adicional local ──────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return mappedLogs.filter((log) => {
      // Obra
      if (worksiteFilter !== 'all' && log.worksiteId !== worksiteFilter) return false
      // Funcionário
      if (employeeFilter !== 'all' && log.employeeId !== employeeFilter) return false
      return true
    })
  }, [mappedLogs, worksiteFilter, employeeFilter])

  // ── Ordenação ──────────────────────────────────────────────────────────
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'logDate')        cmp = a.logDate.localeCompare(b.logDate)
      else if (sortKey === 'employeeName')  cmp = a.employeeName.localeCompare(b.employeeName)
      else if (sortKey === 'worksiteName')  cmp = a.worksiteName.localeCompare(b.worksiteName)
      else if (sortKey === 'totalHours')    cmp = a.totalHours - b.totalHours
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredLogs, sortKey, sortDir])

  // ── KPIs ───────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalHours = filteredLogs.reduce((s, l) => s + l.totalHours, 0)
    const totalOvertime = filteredLogs.reduce((s, l) => s + l.overtimeHours, 0)

    // Horas por obra
    const hoursByWs: Record<string, { name: string; hours: number }> = {}
    filteredLogs.forEach((l) => {
      if (!hoursByWs[l.worksiteId]) hoursByWs[l.worksiteId] = { name: l.worksiteName, hours: 0 }
      hoursByWs[l.worksiteId].hours += l.totalHours
    })
    const topWs = Object.values(hoursByWs).sort((a, b) => b.hours - a.hours)[0]

    // Horas por funcionário
    const hoursByEmp: Record<string, { name: string; hours: number }> = {}
    filteredLogs.forEach((l) => {
      if (!hoursByEmp[l.employeeId]) hoursByEmp[l.employeeId] = { name: l.employeeName, hours: 0 }
      hoursByEmp[l.employeeId].hours += l.totalHours
    })
    const topEmp = Object.values(hoursByEmp).sort((a, b) => b.hours - a.hours)[0]

    const inconsistencies = filteredLogs.filter((l) => l.hasInconsistency).length

    return { totalHours, totalOvertime, topWs, topEmp, inconsistencies }
  }, [filteredLogs])

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    exportToCSV(sortedLogs, PERIOD_LABELS[period].toLowerCase().replace(' ', '_'))
  }, [sortedLogs, period])

  // ── TELA DE CARREGAMENTO ─────────────────────────────────────────────
  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white border border-gray-100 rounded-3xl max-w-md mx-auto">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm text-gray-500 font-medium">Buscando relatório de horas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Relatório de Horas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Rateio por funcionário e centro de custo</p>
        </div>
        <button
          onClick={handleExport}
          disabled={sortedLogs.length === 0}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold',
            'border-2 transition-all duration-150 active:scale-[0.97]',
            sortedLogs.length === 0
              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
              : 'border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white shadow-sm',
          )}
        >
          <Download size={16} />
          Exportar CSV
          {sortedLogs.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-white/20">
              {sortedLogs.length}
            </span>
          )}
        </button>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro ao atualizar dados:</span> {fetchError}
          </div>
          <Button size="sm" variant="ghost" onClick={loadData} className="text-red-800 hover:bg-red-100 shrink-0">
            Recarregar
          </Button>
        </div>
      )}

      {/* ── Filtros de período ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150',
              period === p
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary/40',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          icon={Clock}
          iconBg="bg-brand-primary/10"
          iconColor="text-brand-primary"
          label="Total de Horas"
          value={`${kpis.totalHours.toFixed(1).replace('.', ',')}h`}
          sub={kpis.totalOvertime > 0 ? `${kpis.totalOvertime.toFixed(1).replace('.', ',')}h extras` : 'Sem horas extras'}
        />
        <KPICard
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="C.C. Mais Ativo"
          value={kpis.topWs?.name ?? '—'}
          sub={kpis.topWs ? `${kpis.topWs.hours.toFixed(1).replace('.', ',')}h acumuladas` : 'Sem dados'}
        />
        <KPICard
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Maior Jornada"
          value={kpis.topEmp?.name.split(' ')[0] ?? '—'}
          sub={kpis.topEmp ? `${kpis.topEmp.hours.toFixed(1).replace('.', ',')}h acumuladas` : 'Sem dados'}
        />
        <KPICard
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="Inconsistências"
          value={String(kpis.inconsistencies)}
          sub={kpis.inconsistencies > 0 ? 'Requer revisão do gestor' : 'Todos os registros ok'}
          alert={kpis.inconsistencies > 0}
        />
      </div>

      {/* ── Filtros de obra e funcionário ─────────────────────────────── */}
      <Card className="bg-white border border-gray-100 shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Filtros adicionais</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ws-filter" className="block text-xs font-semibold text-gray-500 mb-1.5">Obra / C.C.</label>
            <select
              id="ws-filter"
              value={worksiteFilter}
              onChange={(e) => setWorksiteFilter(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm
                         text-gray-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
            >
              <option value="all">Todas as obras</option>
              {worksites.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="emp-filter" className="block text-xs font-semibold text-gray-500 mb-1.5">Funcionário</label>
            <select
              id="emp-filter"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm
                         text-gray-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
            >
              <option value="all">Todos os funcionários</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName} ({e.registration})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── Tabela ────────────────────────────────────────────────────── */}
      <Card className="bg-white border border-gray-100 shadow-card overflow-hidden p-0">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-brand-primary" />
            <p className="font-bold text-gray-900 text-sm">
              Lançamentos — {PERIOD_LABELS[period]}
            </p>
            <Badge variant="brand">{sortedLogs.length} registro{sortedLogs.length !== 1 ? 's' : ''}</Badge>
          </div>
          {kpis.inconsistencies > 0 && (
            <Badge variant="critical" dot>{kpis.inconsistencies} alerta{kpis.inconsistencies !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {sortedLogs.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">Nenhum lançamento no período</p>
            <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou registre horas no Diário de Classe</p>
          </div>
        ) : (
          /* Tabela horizontal com scroll no mobile */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  <SortableTh label="Funcionário"   sortKey="employeeName"  currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Obra / C.C."   sortKey="worksiteName"  currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableTh label="Data"           sortKey="logDate"       currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Horários</th>
                  <SortableTh label="Horas"          sortKey="totalHours"    currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Turno</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log, i) => (
                  <TableRow key={log.id} log={log} index={i} />
                ))}
              </tbody>
              {/* Rodapé com totais */}
              <tfoot className="bg-slate-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">
                    Total ({sortedLogs.length} registros):
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-extrabold text-brand-primary tabular-nums">
                      {kpis.totalHours.toFixed(1).replace('.', ',')}h
                    </p>
                    {kpis.totalOvertime > 0 && (
                      <p className="text-xs font-bold text-brand-accent">
                        +{kpis.totalOvertime.toFixed(1).replace('.', ',')}h ext.
                      </p>
                    )}
                  </td>
                  <td colSpan={2} className="px-3 py-3">
                    {kpis.inconsistencies > 0 ? (
                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle size={13} />
                        {kpis.inconsistencies} inconsistência{kpis.inconsistencies !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        Todos ok
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ── Legenda de inconsistências ─────────────────────────────────── */}
      {kpis.inconsistencies > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Registros com inconsistência detectada</p>
            <p className="text-xs text-amber-700 mt-0.5">
              As linhas marcadas em vermelho requerem revisão do gestor ou encarregado.
              Use o botão "Exportar CSV" para compartilhar com o RH.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
