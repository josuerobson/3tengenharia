// src/pages/time-logs/DailyLogPage.tsx
// Diário de Classe — Preenchimento rápido de horas ao final do turno.
// Layout mobile-first:
//   • Topo: seletor de Obra (combobox filtrável)
//   • Meio: lista de funcionários com checkboxes touch-friendly
//   • Base: painel de horários coletivos fixo no mobile, sticky no desktop

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Building2,
  Search,
  CheckCircle2,
  ChevronDown,
  Clock,
  Users,
  Calendar,
  RotateCcw,
  Send,
  MapPin,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  SHIFT_TYPE_LABELS,
  calculateNetHours,
  validateTimes,
  type ShiftType,
} from '@/data/mockData'
import {
  assetsApi,
  timeLogsApi,
  type ApiWorksite,
  type ApiEmployee,
  type ApiBulkTimeLogParams,
} from '@/lib/api'

// ── Combobox de Obras ─────────────────────────────────────────────────────────

interface WorksiteComboboxProps {
  worksites: ApiWorksite[]
  value: ApiWorksite | null
  onChange: (w: ApiWorksite | null) => void
  error?: string
}

function WorksiteCombobox({ worksites, value, onChange, error }: WorksiteComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [isOpen])

  const filtered = useMemo(
    () =>
      worksites.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [worksites, search],
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={cn(
          'flex items-center justify-between w-full h-12 px-4 rounded-xl border bg-white text-sm',
          'transition-all duration-150 focus-visible:outline-none',
          isOpen
            ? 'border-brand-primary ring-2 ring-brand-primary/20'
            : error
              ? 'border-red-400'
              : 'border-gray-200 hover:border-brand-primary/50',
        )}
        aria-expanded={isOpen}
      >
        {value ? (
          <div className="flex items-center gap-3 min-w-0">
            <Building2 size={16} className="text-brand-primary flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{value.name}</p>
              <p className="text-xs text-gray-400 truncate">Código: {value.code}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 flex items-center gap-2">
            <Building2 size={16} />
            Selecionar obra / centro de custo...
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn('text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span className="font-semibold">⚠</span> {error}
        </p>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-xl border border-gray-200 shadow-dropdown overflow-hidden animate-slide-down">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar obra ou C.C...."
                className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto scrollbar-thin py-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">Nenhuma obra encontrada</div>
            ) : (
              filtered.map((w) => (
                <button
                   key={w.id}
                   type="button"
                   onClick={() => { onChange(w); setIsOpen(false); setSearch('') }}
                   className={cn(
                     'flex items-center gap-3 w-full px-3 py-3 text-left transition-colors',
                     value?.id === w.id ? 'bg-brand-primary/8 text-brand-primary' : 'hover:bg-gray-50',
                   )}
                >
                  <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{w.name}</p>
                    <p className="text-xs text-gray-500 truncate">CC: {w.code}</p>
                  </div>
                  {value?.id === w.id && <CheckCircle2 size={15} className="text-brand-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Linha de Funcionário com Checkbox ─────────────────────────────────────────

interface EmployeeRowProps {
  employee: ApiEmployee
  checked: boolean
  onToggle: (id: string) => void
}

function EmployeeRow({ employee, checked, onToggle }: EmployeeRowProps) {
  const initials = employee.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <button
      type="button"
      onClick={() => onToggle(employee.id)}
      className={cn(
        'flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl border-2 transition-all duration-150',
        'text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
        checked
          ? 'bg-brand-primary/5 border-brand-primary/40 shadow-sm'
          : 'bg-white border-gray-100 hover:border-brand-primary/30 hover:bg-brand-primary/3',
      )}
      role="checkbox"
      aria-checked={checked}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
          'transition-all duration-150',
          checked ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500',
        )}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm truncate', checked ? 'text-brand-primary' : 'text-gray-900')}>
          {employee.fullName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {employee.registration} · {employee.position}
        </p>
      </div>

      {/* Checkbox visual (large, touch-friendly) */}
      <div
        className={cn(
          'w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0',
          'transition-all duration-150',
          checked ? 'bg-brand-primary border-brand-primary' : 'border-gray-300 bg-white',
        )}
        aria-hidden="true"
      >
        {checked && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  )
}

// ── Input de Hora estilizado ──────────────────────────────────────────────────

interface TimeInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function TimeInput({ id, label, value, onChange, required }: TimeInputProps) {
  return (
    <div>
      <Label htmlFor={id} required={required} className="text-xs">{label}</Label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3',
          'text-sm font-semibold text-gray-900',
          'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
          'outline-none transition-all duration-150',
          '[color-scheme:light]', // Prevents dark mode time picker UI
        )}
      />
    </div>
  )
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface BulkPayloadEntry {
  employeeId: string
  employeeName: string
  registration: string
  entryTime: string
  breakStartTime: string | null
  breakEndTime: string | null
  exitTime: string
  totalHours: number
  overtimeHours: number
}

interface BulkPayload {
  worksiteId: string
  worksiteName: string
  costCenter: string
  logDate: string
  shiftType: ShiftType
  entries: BulkPayloadEntry[]
}

type PageState = 'FORM' | 'SUBMITTING' | 'SUCCESS'

// ── Página principal ─────────────────────────────────────────────────────────

export default function DailyLogPage() {
  // ── Obras e Funcionários do Servidor ──────────────────────────────────
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Selecionados ───────────────────────────────────────────────────────
  const [selectedWorksite, setSelectedWorksite] = useState<ApiWorksite | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [employeeSearch, setEmployeeSearch] = useState('')

  // ── Horários coletivos ─────────────────────────────────────────────────
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [logDate, setLogDate] = useState(today)
  const [shiftType, setShiftType] = useState<ShiftType>('REGULAR')
  const [entryTime, setEntryTime] = useState('07:00')
  const [breakStart, setBreakStart] = useState('12:00')
  const [breakEnd, setBreakEnd] = useState('13:00')
  const [exitTime, setExitTime] = useState('17:00')

  // ── Estado da página ───────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('FORM')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submittedPayload, setSubmittedPayload] = useState<BulkPayload | null>(null)

  // ── Carregar Obras e Funcionários ──────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const [wList, eList] = await Promise.all([
        assetsApi.listWorksites(),
        assetsApi.listEmployees(),
      ])
      setWorksites(wList)
      setEmployees(eList)
    } catch (err: any) {
      console.error(err)
      setFetchError(err?.message ?? 'Falha ao sincronizar com o banco de dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // ── Funcionários filtrados ─────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim()
    return employees.filter(
      (e) =>
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.registration.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }, [employees, employeeSearch])

  // ── Cálculos em tempo real ─────────────────────────────────────────────
  const netHours = useMemo(
    () => calculateNetHours(entryTime, breakStart, breakEnd, exitTime),
    [entryTime, breakStart, breakEnd, exitTime],
  )

  const overtimeHours = useMemo(() => Math.max(0, netHours - 8), [netHours])

  // ── Select All ────────────────────────────────────────────────────────
  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployees.has(e.id))
  const someSelected = filteredEmployees.some((e) => selectedEmployees.has(e.id))
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  const handleSelectAll = useCallback(() => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        filteredEmployees.forEach((e) => next.delete(e.id))
      } else {
        filteredEmployees.forEach((e) => next.add(e.id))
      }
      return next
    })
  }, [allSelected, filteredEmployees])

  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const newErrors: Record<string, string> = {}

    if (!selectedWorksite) newErrors.worksite = 'Selecione uma obra.'
    if (selectedEmployees.size === 0) newErrors.employees = 'Selecione pelo menos um funcionário.'
    const timeError = validateTimes(entryTime, breakStart, breakEnd, exitTime)
    if (timeError) newErrors.time = timeError
    if (netHours <= 0) newErrors.time = 'Verifique os horários informados.'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setPageState('SUBMITTING')

    const payload: ApiBulkTimeLogParams = {
      employeeIds: Array.from(selectedEmployees),
      worksiteId: selectedWorksite!.id,
      workDate: logDate,
      clockIn: entryTime,
      clockOut: exitTime,
      breakStart: breakStart || null,
      breakEnd: breakEnd || null,
      shiftType,
      notes: '',
    }

    try {
      await timeLogsApi.createBulk(payload)
      
      setSubmittedPayload({
        worksiteId: selectedWorksite!.id,
        worksiteName: selectedWorksite!.name,
        costCenter: selectedWorksite!.code,
        logDate,
        shiftType,
        entries: Array.from(selectedEmployees).map((empId) => {
          const emp = employees.find((e) => e.id === empId)!
          return {
            employeeId: empId,
            employeeName: emp.fullName,
            registration: emp.registration,
            entryTime,
            breakStartTime: breakStart || null,
            breakEndTime: breakEnd || null,
            exitTime,
            totalHours: netHours,
            overtimeHours,
          }
        }),
      })
      setPageState('SUCCESS')
    } catch (err: any) {
      console.error('Erro ao enviar lote:', err)
      setErrors((prev) => ({
        ...prev,
        submit: err?.message ?? 'Falha ao salvar lançamento de horas no servidor.',
      }))
      setPageState('FORM')
    }
  }, [selectedWorksite, selectedEmployees, logDate, shiftType, entryTime, breakStart, breakEnd, exitTime, netHours, overtimeHours, employees])

  const handleReset = useCallback(() => {
    setPageState('FORM')
    setSelectedEmployees(new Set())
    setSubmittedPayload(null)
    setErrors({})
  }, [])

  // ── TELA DE CARREGAMENTO ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white border border-gray-100 rounded-3xl max-w-md mx-auto">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm text-gray-500 font-medium">Carregando diário de classe...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Erro ao Carregar</h3>
        <p className="text-sm text-gray-500 mb-6">{fetchError}</p>
        <Button onClick={loadInitialData} className="w-full">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  // ── TELA DE SUCESSO ──────────────────────────────────────────────────
  if (pageState === 'SUCCESS' && submittedPayload) {
    const { worksiteName, costCenter, logDate: ld, entries } = submittedPayload
    const dateLabel = new Date(ld + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    return (
      <div className="max-w-md mx-auto pt-4 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Lançamento Gravado!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Horas registradas com sucesso no diário de classe.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2.5 mb-6">
            <InfoRow icon={Building2} label="Obra" value={`${worksiteName} · ${costCenter}`} />
            <InfoRow icon={Calendar} label="Data" value={dateLabel} />
            <InfoRow icon={Clock} label="Jornada" value={`${entryTime} → ${exitTime} (${netHours.toFixed(1).replace('.', ',')}h líquidas)`} />
            <InfoRow icon={Users} label="Funcionários" value={`${entries.length} colaborador(es) registrado(s)`} />
            {overtimeHours > 0 && (
              <InfoRow icon={AlertCircle} label="Horas extras" value={`${overtimeHours.toFixed(1).replace('.', ',')}h por funcionário`} />
            )}
          </div>

          {/* Preview de funcionários gravados */}
          <div className="text-left mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registrado para:</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {entries.map((e) => (
                <span key={e.employeeId} className="text-xs bg-brand-primary/10 text-brand-primary font-medium px-2.5 py-1 rounded-full">
                  {e.employeeName.split(' ')[0]} {e.employeeName.split(' ').slice(-1)[0]}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" variant="accent" className="w-full" onClick={handleReset}>
              <RotateCcw size={16} />
              Gravar Novo Lançamento
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => window.location.assign('/time-logs/report')}>
              Ver Relatório de Horas
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── FORMULÁRIO PRINCIPAL ─────────────────────────────────────────────
  const selectedCount = selectedEmployees.size

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Diário de Classe</h1>
        <p className="text-gray-500 text-sm mt-0.5">Rateio de horas — Módulo 3</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ══════ Coluna Esquerda — Obra + Funcionários ══════ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Seletor de Obra */}
          <Card className="p-4 bg-white border border-gray-100 shadow-card">
            <Label required>Obra / Centro de Custo</Label>
            <WorksiteCombobox
              worksites={worksites}
              value={selectedWorksite}
              onChange={setSelectedWorksite}
              error={errors.worksite}
            />
            {selectedWorksite && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                <MapPin size={12} />
                Centro de Custo: {selectedWorksite.code} · {selectedWorksite.name}
              </div>
            )}
          </Card>

          {/* Lista de Funcionários */}
          <Card className="bg-white border border-gray-100 shadow-card overflow-hidden p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded accent-brand-primary cursor-pointer"
                    aria-label="Selecionar todos os funcionários"
                  />
                  <span className="font-semibold text-sm text-gray-700">Selecionar todos</span>
                </label>
                {someSelected && (
                  <Badge variant="brand" dot>
                    {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-400">{filteredEmployees.length} funcionários</span>
            </div>

            {/* Busca */}
            <div className="px-4 py-2.5 border-b border-gray-50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Filtrar por nome ou matrícula..."
                  className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-xl
                             focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            {/* Error de seleção */}
            {errors.employees && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium">{errors.employees}</p>
              </div>
            )}

            {/* Lista */}
            <div className="p-3 space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum funcionário encontrado
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    checked={selectedEmployees.has(emp.id)}
                    onToggle={handleToggleEmployee}
                  />
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ══════ Painel de Horários ══════ */}
        <div className="w-full lg:w-80 xl:w-96 lg:flex-shrink-0">
          {/* Wrapper sticky no desktop */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-card">
              {/* Título do painel */}
              <div className="hidden lg:flex items-center gap-2 mb-4">
                <Clock size={16} className="text-brand-primary" />
                <h3 className="font-bold text-gray-900">Horários do Turno</h3>
              </div>

              {/* Data e Tipo de Turno */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <Label htmlFor="log-date" required className="text-xs">Data</Label>
                  <input
                    id="log-date"
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    max={today}
                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold
                               text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                               outline-none transition-all [color-scheme:light]"
                  />
                </div>
                <div>
                  <Label htmlFor="shift-type" className="text-xs">Tipo de Turno</Label>
                  <select
                    id="shift-type"
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as ShiftType)}
                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold
                               text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                               outline-none transition-all"
                  >
                    {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <TimeInput id="entry-time"  label="Entrada" value={entryTime}  onChange={setEntryTime}  required />
                <TimeInput id="exit-time"   label="Saída"   value={exitTime}   onChange={setExitTime}   required />
                <TimeInput id="break-start" label="Início do Intervalo" value={breakStart} onChange={setBreakStart} />
                <TimeInput id="break-end"   label="Fim do Intervalo"    value={breakEnd}   onChange={setBreakEnd} />
              </div>

              {/* Erro de horário ou de envio */}
              {(errors.time || errors.submit) && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200 mb-3">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{errors.time || errors.submit}</p>
                </div>
              )}

              {/* Preview de horas calculadas */}
              {netHours > 0 && (
                <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-xl p-3 mb-3 text-center">
                  <p className="text-xs font-medium text-brand-primary/60 uppercase tracking-wide">Horas Líquidas</p>
                  <p className="text-3xl font-extrabold text-brand-primary tabular-nums">
                    {netHours.toFixed(1).replace('.', ',')}
                    <span className="text-base font-bold ml-1 text-brand-primary/60">h</span>
                  </p>
                  {overtimeHours > 0 && (
                    <p className="text-xs text-brand-accent font-semibold mt-0.5">
                      + {overtimeHours.toFixed(1).replace('.', ',')}h extras
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">por funcionário selecionado</p>
                </div>
              )}

              {/* Informação de seleção */}
              {selectedCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl mb-3">
                  <Users size={14} className="text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-600 font-medium">
                    <span className="font-bold text-brand-primary">{selectedCount}</span>{' '}
                    funcionário{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
                    {netHours > 0 && ` · ${(selectedCount * netHours).toFixed(1).replace('.', ',')}h total`}
                  </p>
                </div>
              )}

              {/* Botão principal */}
              <Button
                variant="accent"
                size="lg"
                className="w-full font-bold shadow-lg shadow-brand-accent/25"
                onClick={handleSubmit}
                disabled={pageState === 'SUBMITTING'}
              >
                {pageState === 'SUBMITTING' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Gravando lançamento...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Gravar Lançamento em Lote
                    {selectedCount > 0 && (
                      <span className="ml-1 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                  </>
                )}
              </Button>

              {/* Informação */}
              <p className="flex items-start gap-1.5 mt-3 text-[11px] text-gray-400 leading-relaxed">
                <Info size={11} className="flex-shrink-0 mt-0.5" />
                Os horários são aplicados igualmente a todos os funcionários selecionados.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Componente auxiliar ───────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  )
}
