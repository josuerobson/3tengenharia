// src/pages/fiveS/QualityValidationPanel5S.tsx
// Painel de Validação 5S — Setor de Qualidade.
// Desktop/tablet-first com suporte a mobile via cards responsivos.

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ClipboardCheck,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  User,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  compute5SKPIs,
  VALIDATION_LABELS,
  STATUS_5S_LABELS,
  type Audit5SEntry,
  type ValidationStatus,
} from '@/data/mockData'
import { fiveSApi, type ApiAudit5S } from '@/lib/api'

// ── Tipos locais ──────────────────────────────────────────────────────────────

type FilterValidation = 'ALL' | ValidationStatus
type ValidateAction   = 'APROVADO' | 'REPROVADO'

// ── Badge de Status ───────────────────────────────────────────────────────────

function ValidationBadge({ status }: { status: ValidationStatus }) {
  const cfg: Record<ValidationStatus, { cls: string; label: string }> = {
    AGUARDANDO_AVALIACAO: { cls: 'bg-amber-100 text-amber-800 border-amber-300',      label: '⏳ Aguardando' },
    APROVADO:             { cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: '✓ Aprovado' },
    REPROVADO:            { cls: 'bg-red-100 text-red-800 border-red-300',             label: '✗ Reprovado' },
  }
  const { cls, label } = cfg[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border', cls)}>
      {label}
    </span>
  )
}

function StatusBadge5S({ status }: { status: 'CONFORME' | 'NAO_CONFORME' }) {
  return status === 'CONFORME' ? (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
      <CheckCircle2 size={11} /> Conforme
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
      <AlertTriangle size={11} /> Não Conforme
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: string
  sub?: string
}

function KpiCard({ icon: Icon, label, value, accent = 'text-brand-primary', sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
        accent === 'text-brand-primary' ? 'bg-brand-primary/10' :
        accent === 'text-amber-600'     ? 'bg-amber-50' :
        accent === 'text-red-600'       ? 'bg-red-50' : 'bg-emerald-50')}>
        <Icon size={20} className={accent} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Carrossel de Fotos ────────────────────────────────────────────────────────

function PhotoCarousel({ photos }: { photos: Audit5SEntry['photos'] }) {
  const [idx, setIdx] = useState(0)
  if (!photos.length) return (
    <div className="flex items-center justify-center h-40 bg-gray-100 rounded-xl text-gray-400 text-sm gap-2">
      <Camera size={18} /> Sem fotos
    </div>
  )
  const current = photos[idx]!
  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900">
        <img
          key={current.id}
          src={current.photoUrl}
          alt={`Foto ${idx + 1} de ${photos.length}`}
          className="w-full h-52 object-cover"
          loading="lazy"
        />
        {/* Contador */}
        <span className="absolute top-2 right-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded-full font-bold">
          {idx + 1}/{photos.length}
        </span>
        {/* Nav anterior */}
        {idx > 0 && (
          <button
            onClick={() => setIdx((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/75"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {/* Nav próxima */}
        {idx < photos.length - 1 && (
          <button
            onClick={() => setIdx((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/75"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      {/* Thumbs */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {photos.map((ph, i) => (
            <button key={ph.id} onClick={() => setIdx(i)}
              className={cn('flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                i === idx ? 'border-brand-primary' : 'border-transparent opacity-60 hover:opacity-100'
              )}>
              <img src={ph.photoUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal de Validação ────────────────────────────────────────────────────────

interface ValidationModalProps {
  audit: Audit5SEntry
  onClose: () => void
  onValidate: (id: string, action: ValidateAction, correctiveAction?: string) => Promise<void>
}

function ValidationModal({ audit, onClose, onValidate }: ValidationModalProps) {
  const [action, setAction]               = useState<ValidateAction | null>(null)
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [caError, setCaError]             = useState('')

  const isPending = audit.validation === 'AGUARDANDO_AVALIACAO'

  const handleValidate = useCallback(async () => {
    if (!action) return
    if (action === 'REPROVADO' && correctiveAction.trim().length < 10) {
      setCaError('Descreva a ação corretiva com pelo menos 10 caracteres.')
      return
    }
    setCaError('')
    setSubmitting(true)
    await onValidate(audit.id, action, action === 'REPROVADO' ? correctiveAction.trim() : undefined)
    setSubmitting(false)
    onClose()
  }, [action, correctiveAction, audit.id, onValidate, onClose])

  return (
    <div className="space-y-5">
      {/* Dados da Auditoria */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
        <InfoRow icon={Building2} label="Obra"     value={`${audit.worksiteName} · ${audit.worksiteCity}`} />
        <InfoRow icon={MapPin}    label="Área"     value={audit.areaType} />
        <InfoRow icon={User}      label="Auditor"  value={`${audit.auditorName} (${audit.auditorRegistration})`} />
        <InfoRow icon={Calendar}  label="Data"     value={new Date(audit.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        <div className="flex items-center gap-2.5 pt-0.5">
          <CheckCircle2 size={13} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">Status:</p>
          <StatusBadge5S status={audit.status} />
        </div>
      </div>

      {/* Descrição */}
      {audit.description && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Descrição da Irregularidade</p>
          <div className={cn('rounded-xl p-3.5 text-sm leading-relaxed',
            audit.status === 'NAO_CONFORME' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-gray-50 text-gray-700')}>
            {audit.description}
          </div>
        </div>
      )}

      {/* Fotos */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Registros Fotográficos ({audit.photos.length})
        </p>
        <PhotoCarousel photos={audit.photos} />
      </div>

      {/* Ação Corretiva (readonly, se já reprovado) */}
      {audit.correctiveAction && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ação Corretiva Emitida</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-sm text-orange-900 leading-relaxed">
            {audit.correctiveAction}
          </div>
        </div>
      )}

      {/* Painel de Validação — apenas para AGUARDANDO_AVALIACAO */}
      {isPending ? (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700">Decisão do Setor de Qualidade</p>

          {/* Botões de Aprovar / Reprovar */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction('APROVADO')}
              className={cn(
                'flex flex-col items-center justify-center gap-2 h-20 rounded-2xl border-2 transition-all active:scale-[0.97]',
                action === 'APROVADO'
                  ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100'
                  : 'bg-white border-gray-200 hover:border-emerald-300',
              )}
            >
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center',
                action === 'APROVADO' ? 'bg-emerald-500' : 'bg-gray-100')}>
                <ShieldCheck size={19} className={action === 'APROVADO' ? 'text-white' : 'text-gray-400'} />
              </div>
              <span className={cn('text-xs font-bold', action === 'APROVADO' ? 'text-emerald-700' : 'text-gray-500')}>
                Aprovar
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAction('REPROVADO')}
              className={cn(
                'flex flex-col items-center justify-center gap-2 h-20 rounded-2xl border-2 transition-all active:scale-[0.97]',
                action === 'REPROVADO'
                  ? 'bg-red-50 border-red-500 shadow-md shadow-red-100'
                  : 'bg-white border-gray-200 hover:border-red-300',
              )}
            >
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center',
                action === 'REPROVADO' ? 'bg-red-500' : 'bg-gray-100')}>
                <XCircle size={19} className={action === 'REPROVADO' ? 'text-white' : 'text-gray-400'} />
              </div>
              <span className={cn('text-xs font-bold', action === 'REPROVADO' ? 'text-red-700' : 'text-gray-500')}>
                Reprovar
              </span>
            </button>
          </div>

          {/* Campo de Ação Corretiva — aparece dinamicamente ao reprovar */}
          <div className={cn(
            'overflow-hidden transition-all duration-300',
            action === 'REPROVADO' ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
          )}>
            <div className="pt-1 space-y-2">
              <label htmlFor="corrective-action" className="text-xs font-bold text-red-700 flex items-center gap-1">
                <AlertTriangle size={11} />
                Ação Corretiva Obrigatória <span className="text-red-500">*</span>
              </label>
              <textarea
                id="corrective-action"
                rows={4}
                value={correctiveAction}
                onChange={(e) => { setCorrectiveAction(e.target.value); setCaError('') }}
                placeholder="Descreva a ação corretiva, responsável e prazo de execução..."
                className={cn(
                  'flex w-full rounded-xl border px-3.5 py-3 text-sm resize-none focus:outline-none transition-all',
                  caError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50'
                    : 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white',
                )}
              />
              {caError && <p className="text-xs text-red-600 font-medium">⚠ {caError}</p>}
            </div>
          </div>

          {/* Botão de Confirmar */}
          {action && (
            <Button
              size="lg"
              className={cn(
                'w-full font-bold rounded-2xl animate-fade-in-up',
                action === 'APROVADO' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white',
              )}
              onClick={handleValidate}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Registrando decisão...</>
              ) : action === 'APROVADO' ? (
                <><ShieldCheck size={16} /> Confirmar Aprovação</>
              ) : (
                <><XCircle size={16} /> Confirmar Reprovação</>
              )}
            </Button>
          )}
        </div>
      ) : (
        // Leitura — validação já realizada
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">Validação</p>
            <ValidationBadge status={audit.validation} />
          </div>
          {audit.validatorEmail && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <User size={11} /> Validado por: {audit.validatorEmail}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Linha de info do modal ────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-gray-500 flex-shrink-0">{label}:</p>
      <p className="text-xs font-semibold text-gray-800 leading-tight">{value}</p>
    </div>
  )
}

// ── Linha/Card de Auditoria ───────────────────────────────────────────────────

function AuditRow({ audit, onOpen }: { audit: Audit5SEntry; onOpen: () => void }) {
  const isPending = audit.validation === 'AGUARDANDO_AVALIACAO'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full flex flex-col sm:flex-row sm:items-center gap-3 text-left',
        'p-4 rounded-2xl border transition-all duration-150 group',
        'hover:shadow-md hover:border-brand-primary/30',
        isPending
          ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
          : 'bg-white border-gray-100 hover:bg-slate-50',
      )}
    >
      {/* Status icon */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        audit.status === 'CONFORME' ? 'bg-emerald-100' : 'bg-red-100')}>
        {audit.status === 'CONFORME'
          ? <CheckCircle2 size={18} className="text-emerald-600" />
          : <AlertTriangle size={18} className="text-red-600" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate">{audit.worksiteName}</p>
          <ValidationBadge status={audit.validation} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {audit.areaType} · {audit.auditorName} · {new Date(audit.createdAt).toLocaleDateString('pt-BR')}
        </p>
        {audit.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{audit.description}</p>
        )}
      </div>

      {/* Fotos count + arrow */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Camera size={12} /> {audit.photos.length}
        </span>
        <StatusBadge5S status={audit.status} />
        <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-primary transition-colors" />
      </div>
    </button>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function QualityValidationPanel5S() {
  const [audits, setAudits]           = useState<Audit5SEntry[]>([])
  const [selectedAudit, setSelectedAudit] = useState<Audit5SEntry | null>(null)
  const [filterValidation, setFilterValidation] = useState<FilterValidation>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CONFORME' | 'NAO_CONFORME'>('ALL')
  const [search, setSearch]           = useState('')
  const [refreshing, setRefreshing]   = useState(false)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const loadAudits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fiveSApi.list({ limit: 100 })
      const mapped = res.audits.map((a: ApiAudit5S) => ({
        id: a.id,
        worksiteId: a.worksiteId,
        worksiteName: a.worksite?.name ?? 'Obra',
        worksiteCity: a.worksite?.city ?? 'Cidade',
        areaType: a.areaType as any,
        status: a.status,
        description: a.description ?? '',
        photos: a.photos ?? [],
        auditorEmployeeId: a.auditorEmployeeId,
        auditorName: a.auditorEmployee?.fullName ?? 'Auditor',
        auditorRegistration: a.auditorEmployee?.registration ?? '-',
        validation: a.validation,
        correctiveAction: a.correctiveAction ?? null,
        validatorId: a.validatorUser?.id ?? null,
        validatorEmail: a.validatorUser?.email ?? null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
      setAudits(mapped)
    } catch (err: any) {
      console.error('Erro ao carregar auditorias 5S:', err)
      setError(err?.message ?? 'Falha ao carregar auditorias. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAudits()
  }, [loadAudits])

  const kpis = useMemo(() => compute5SKPIs(audits), [audits])

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (filterValidation !== 'ALL' && a.validation !== filterValidation) return false
      if (filterStatus     !== 'ALL' && a.status     !== filterStatus)     return false
      if (search && !a.worksiteName.toLowerCase().includes(search.toLowerCase()) &&
          !a.auditorName.toLowerCase().includes(search.toLowerCase()) &&
          !a.areaType.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => {
      // Pendentes primeiro, depois por data decrescente
      if (a.validation === 'AGUARDANDO_AVALIACAO' && b.validation !== 'AGUARDANDO_AVALIACAO') return -1
      if (b.validation === 'AGUARDANDO_AVALIACAO' && a.validation !== 'AGUARDANDO_AVALIACAO') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [audits, filterValidation, filterStatus, search])

  const handleValidate = useCallback(async (id: string, action: ValidateAction, correctiveAction?: string) => {
    try {
      await fiveSApi.validate(id, {
        validation: action,
        correctiveAction,
      })
      await loadAudits()
    } catch (err: any) {
      console.error('Erro ao validar auditoria:', err)
      alert(err?.message ?? 'Falha ao salvar decisão.')
    }
  }, [loadAudits])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAudits()
    setRefreshing(false)
  }, [loadAudits])

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <ClipboardCheck size={22} className="text-brand-primary" />
            Painel de Qualidade 5S
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Validação de auditorias de organização</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={ClipboardCheck}  label="Total de Auditorias" value={kpis.total} />
        <KpiCard icon={Clock}           label="Aguardando Avaliação" value={kpis.pending}
          accent="text-amber-600"
          sub={kpis.pending > 0 ? `${kpis.pending} pendente(s)` : 'Nenhuma pendência'} />
        <KpiCard icon={AlertTriangle}   label="Não Conformidades"   value={kpis.naoConforme} accent="text-red-600"
          sub={kpis.criticalSite ? `↑ ${kpis.criticalSite.name}` : undefined} />
        <KpiCard icon={XCircle}         label="Reprovados"          value={kpis.reprovados}  accent="text-red-600" />
      </div>

      {/* Destaque de Pendências */}
      {kpis.pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {kpis.pending} auditoria{kpis.pending > 1 ? 's' : ''} aguardando avaliação
            </p>
            <p className="text-xs text-amber-700">Clique em uma linha para revisar e validar.</p>
          </div>
          <button
            type="button"
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2"
            onClick={() => setFilterValidation('AGUARDANDO_AVALIACAO')}
          >
            Filtrar pendentes
          </button>
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <Filter size={14} /> Filtros
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por obra, auditor ou área..."
              className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
          </div>

          {/* Filtro Validação */}
          <select
            value={filterValidation}
            onChange={(e) => setFilterValidation(e.target.value as FilterValidation)}
            className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary bg-white font-medium text-gray-700"
          >
            <option value="ALL">Todas as validações</option>
            <option value="AGUARDANDO_AVALIACAO">⏳ Aguardando</option>
            <option value="APROVADO">✓ Aprovado</option>
            <option value="REPROVADO">✗ Reprovado</option>
          </select>

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary bg-white font-medium text-gray-700"
          >
            <option value="ALL">Todos os status</option>
            <option value="CONFORME">✓ Conforme</option>
            <option value="NAO_CONFORME">⚠ Não Conforme</option>
          </select>

          {/* Limpar filtros */}
          {(filterValidation !== 'ALL' || filterStatus !== 'ALL' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterValidation('ALL'); setFilterStatus('ALL'); setSearch('') }}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ── Lista de Auditorias ─────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Header da lista */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-800">{filtered.length}</span> registro{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== audits.length && ` (de ${audits.length})`}
          </p>
          <p className="text-xs text-gray-400">Pendentes aparecem primeiro</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100 shadow-card">
            <Loader2 size={40} className="animate-spin text-brand-primary/50" />
            <p className="text-sm font-medium">Carregando auditorias...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-3 bg-white rounded-2xl border border-gray-100 shadow-card">
            <AlertTriangle size={40} className="opacity-50" />
            <p className="text-sm font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={loadAudits}>Tentar Novamente</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100 shadow-card">
            <ClipboardCheck size={40} className="opacity-30" />
            <p className="text-sm font-medium">Nenhuma auditoria encontrada</p>
            <p className="text-xs">Ajuste os filtros ou limpe a busca</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((audit) => (
              <AuditRow
                key={audit.id}
                audit={audit}
                onOpen={() => setSelectedAudit(audit)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de Detalhes / Validação ──────────────────────────────── */}
      <Dialog
        open={selectedAudit !== null}
        onClose={() => setSelectedAudit(null)}
        title={selectedAudit
          ? `${STATUS_5S_LABELS[selectedAudit.status]} · ${selectedAudit.areaType}`
          : ''}
        description={selectedAudit
          ? `${selectedAudit.worksiteName} — ${VALIDATION_LABELS[selectedAudit.validation]}`
          : ''}
        maxWidth="sm:max-w-xl"
      >
        {selectedAudit && (
          <ValidationModal
            audit={selectedAudit}
            onClose={() => setSelectedAudit(null)}
            onValidate={handleValidate}
          />
        )}
      </Dialog>
    </div>
  )
}
