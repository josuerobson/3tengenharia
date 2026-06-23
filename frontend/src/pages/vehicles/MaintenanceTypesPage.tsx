// src/pages/vehicles/MaintenanceTypesPage.tsx
// Cadastro dinâmico de tipos de manutenção por veículo.
// CRUD completo integrado ao banco de dados: listar, criar, editar inline e desativar/remover.

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, X, Check,
  Wrench, Gauge, Calendar, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, AlertCircle, History,
  Search, ChevronDown as CaretDown, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  vehiclesApi,
  maintenanceApi,
  type ApiVehicle,
  type ApiMaintenanceType,
} from '@/lib/api'

// ── Tipos locais ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  intervalKm: string
  intervalDays: string
  lastServiceKm: string
  lastServiceDate: string
}

const EMPTY_FORM: FormState = {
  name: '', description: '', intervalKm: '', intervalDays: '',
  lastServiceKm: '', lastServiceDate: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return null
  const dateOnly = iso.split('T')[0]
  if (!dateOnly) return null
  const [y, m, d] = dateOnly.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function vehicleLabel(v: ApiVehicle) {
  return `${v.licensePlate} — ${v.brand} ${v.model} ${v.year}`
}

function vehicleKmLabel(v: ApiVehicle) {
  return `KM atual: ${v.currentKm.toLocaleString('pt-BR')}`
}

// ── Componente: VehicleSearchSelect ───────────────────────────────────────────

interface VehicleSearchSelectProps {
  vehicles: ApiVehicle[]
  selectedId: string
  onSelect: (id: string) => void
}

function VehicleSearchSelect({ vehicles, selectedId, onSelect }: VehicleSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = vehicles.find(v => v.id === selectedId)

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Foca o input ao abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query.trim()
    ? vehicles.filter(v => {
        const q = query.toLowerCase()
        return (
          v.licensePlate.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.year.toString().includes(q)
        )
      })
    : vehicles

  const statusDot = (v: ApiVehicle) => {
    if (v.status === 'ACTIVE')       return 'bg-emerald-400'
    if (v.status === 'MAINTENANCE')  return 'bg-amber-400'
    return 'bg-gray-300'
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-[#00475B]/40 focus:outline-none focus:ring-2 focus:ring-[#00475B]/30 transition-colors"
      >
        {selected ? (
          <>
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', statusDot(selected))} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-gray-800 truncate">
                {vehicleLabel(selected)}
              </span>
              <span className="block text-xs text-[#00475B] font-medium">
                {vehicleKmLabel(selected)}
              </span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-gray-400">Selecione um veículo...</span>
        )}
        <CaretDown
          size={16}
          className={cn('flex-shrink-0 text-gray-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Campo de pesquisa */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por placa, marca ou modelo..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de veículos */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Nenhum veículo encontrado</p>
                <p className="text-xs text-gray-300 mt-0.5">Tente outro termo de busca</p>
              </div>
            ) : (
              filtered.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { onSelect(v.id); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    v.id === selectedId
                      ? 'bg-[#00475B]/8 text-[#00475B]'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', statusDot(v))} />
                  <span className="flex-1 min-w-0">
                    <span className={cn(
                      'block text-sm font-semibold truncate',
                      v.id === selectedId ? 'text-[#00475B]' : 'text-gray-800'
                    )}>
                      {vehicleLabel(v)}
                    </span>
                    <span className={cn(
                      'block text-xs font-medium',
                      v.id === selectedId ? 'text-[#00475B]/70' : 'text-gray-400'
                    )}>
                      {vehicleKmLabel(v)}
                    </span>
                  </span>
                  {v.id === selectedId && (
                    <Check size={14} className="text-[#00475B] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Legenda status */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"/>Ativo
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"/>Manutenção
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-300"/>Inativo
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function MaintenanceTypesPage() {
  const [vehicles, setVehicles]                   = useState<ApiVehicle[]>([])
  const [types, setTypes]                         = useState<ApiMaintenanceType[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState<string | null>(null)

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError]   = useState('')

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  // ── Carregar tipos de manutenção ─────────────────────────────────────────────
  const fetchTypes = useCallback(async (vehicleId: string) => {
    if (!vehicleId) return
    try {
      const res = await maintenanceApi.listTypes(vehicleId)
      setTypes(res.types)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de manutenção.')
    }
  }, [])

  // ── Inicialização de dados ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await vehiclesApi.list()
      setVehicles(res.vehicles)
      if (res.vehicles.length > 0) {
        const firstId = res.vehicles[0].id
        setSelectedVehicleId(firstId)
        await fetchTypes(firstId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar veículos.')
    } finally {
      setLoading(false)
    }
  }, [fetchTypes])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Atualiza tipos quando muda veículo manualmente
  const handleSelectVehicle = useCallback(async (id: string) => {
    setSelectedVehicleId(id)
    setShowForm(false)
    setEditingId(null)
    setLoading(true)
    setError(null)
    try {
      await fetchTypes(id)
    } finally {
      setLoading(false)
    }
  }, [fetchTypes])

  // ── Criar ──────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return }
    if (!selectedVehicleId) return
    setLoading(true)
    setFormError('')
    try {
      await maintenanceApi.createType(selectedVehicleId, {
        name:            form.name.trim(),
        description:     form.description.trim() || null,
        intervalKm:      form.intervalKm ? parseInt(form.intervalKm) : null,
        intervalDays:    form.intervalDays ? parseInt(form.intervalDays) : null,
        lastServiceKm:   form.lastServiceKm ? parseInt(form.lastServiceKm) : null,
        lastServiceDate: form.lastServiceDate || null,
      })
      setForm(EMPTY_FORM)
      setFormError('')
      setShowForm(false)
      await fetchTypes(selectedVehicleId)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar tipo de manutenção.')
    } finally {
      setLoading(false)
    }
  }

  // ── Editar inline ──────────────────────────────────────────────────────────

  function startEdit(t: ApiMaintenanceType) {
    setEditingId(t.id)
    setForm({
      name:            t.name,
      description:     t.description ?? '',
      intervalKm:      t.intervalKm?.toString()      ?? '',
      intervalDays:    t.intervalDays?.toString()    ?? '',
      lastServiceKm:   t.lastServiceKm?.toString()   ?? '',
      lastServiceDate: t.lastServiceDate ? t.lastServiceDate.split('T')[0] : '',
    })
    setFormError('')
  }

  async function saveEdit(id: string) {
    if (!form.name.trim()) { setFormError('Nome obrigatório.'); return }
    if (!selectedVehicleId) return
    setLoading(true)
    setFormError('')
    try {
      await maintenanceApi.updateType(selectedVehicleId, id, {
        name:            form.name.trim(),
        description:     form.description.trim() || null,
        intervalKm:      form.intervalKm ? parseInt(form.intervalKm) : null,
        intervalDays:    form.intervalDays ? parseInt(form.intervalDays) : null,
        lastServiceKm:   form.lastServiceKm ? parseInt(form.lastServiceKm) : null,
        lastServiceDate: form.lastServiceDate || null,
      })
      setEditingId(null)
      setFormError('')
      await fetchTypes(selectedVehicleId)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao atualizar tipo de manutenção.')
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle ativo ───────────────────────────────────────────────────────────

  async function toggleActive(t: ApiMaintenanceType) {
    if (!selectedVehicleId) return
    setLoading(true)
    setError(null)
    try {
      await maintenanceApi.updateType(selectedVehicleId, t.id, {
        isActive: !t.isActive,
      })
      await fetchTypes(selectedVehicleId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status do tipo de manutenção.')
    } finally {
      setLoading(false)
    }
  }

  // ── Remover ────────────────────────────────────────────────────────────────

  async function removeType(id: string) {
    if (!selectedVehicleId) return
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este tipo de manutenção?')) return
    setLoading(true)
    setError(null)
    try {
      await maintenanceApi.deleteType(selectedVehicleId, id)
      await fetchTypes(selectedVehicleId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir tipo de manutenção.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="text-[#00475B]" size={26} />
            Tipos de Manutenção
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre os serviços preventivos de cada veículo. Informe o último serviço para
            calcular automaticamente alertas de proximidade.
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00475B] transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Sincronizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Erro Geral */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Erro na operação</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold text-red-600 hover:underline">
            Dispensar
          </button>
        </div>
      )}

      {/* Seletor de veículo com busca */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Veículo
        </label>
        {vehicles.length > 0 ? (
          <VehicleSearchSelect
            vehicles={vehicles}
            selectedId={selectedVehicleId}
            onSelect={handleSelectVehicle}
          />
        ) : (
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        )}
      </div>

      {/* Botão adicionar */}
      {!showForm && vehicles.length > 0 && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-3 font-semibold text-sm hover:bg-[#003d4f] active:scale-[.98] transition-all shadow disabled:opacity-50"
        >
          <Plus size={18} />
          Novo Tipo de Manutenção
        </button>
      )}

      {/* Formulário de criação */}
      {showForm && selectedVehicle && (
        <div className="rounded-2xl border border-[#00475B]/20 bg-[#00475B]/5 p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-[#00475B]">
            Novo tipo para: {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.licensePlate})
          </p>

          <input
            placeholder="Nome do tipo *  ex: Troca de óleo do motor"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
          />

          <textarea
            placeholder="Descrição (opcional)  ex: Óleo 5W30 sintético + filtro"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
          />

          {/* Intervalos de manutenção */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Intervalos de manutenção</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1"><Gauge size={12} /> A cada (km)</label>
                <input
                  type="number" inputMode="numeric" placeholder="ex: 10000"
                  value={form.intervalKm}
                  onChange={e => setForm(p => ({ ...p, intervalKm: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> A cada (dias)</label>
                <input
                  type="number" inputMode="numeric" placeholder="ex: 180"
                  value={form.intervalDays}
                  onChange={e => setForm(p => ({ ...p, intervalDays: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                />
              </div>
            </div>
          </div>

          {/* Último serviço */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <History size={13} />
              Último serviço realizado
              <span className="font-normal text-amber-500">(opcional — para calcular alertas desde já)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-amber-700 flex items-center gap-1"><Gauge size={12} /> KM do veículo</label>
                <input
                  type="number" inputMode="numeric" placeholder={`ex: ${selectedVehicle.currentKm.toLocaleString('pt-BR')}`}
                  value={form.lastServiceKm}
                  onChange={e => setForm(p => ({ ...p, lastServiceKm: e.target.value }))}
                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-amber-700 flex items-center gap-1"><Calendar size={12} /> Data do serviço</label>
                <input
                  type="date"
                  value={form.lastServiceDate}
                  onChange={e => setForm(p => ({ ...p, lastServiceDate: e.target.value }))}
                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-3 text-sm font-semibold hover:bg-[#003d4f] transition-colors disabled:opacity-50"
            >
              <Check size={16} /> Salvar
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError('') }}
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && types.length === 0 && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Lista de tipos */}
      {!loading && types.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <Wrench className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm text-gray-400 font-medium">Nenhum tipo cadastrado para este veículo.</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Novo Tipo de Manutenção" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {types.map(t => (
            <div
              key={t.id}
              className={cn(
                'rounded-2xl border bg-white shadow-sm overflow-hidden transition-all',
                t.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
              )}
            >
              {editingId === t.id ? (
                /* ── Modo edição ── */
                <div className="p-4 space-y-3">
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                    placeholder="Nome do tipo *"
                  />
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                    placeholder="Descrição (opcional)"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 flex items-center gap-1"><Gauge size={11}/> A cada (km)</label>
                      <input type="number" inputMode="numeric" placeholder="Intervalo km"
                        value={form.intervalKm}
                        onChange={e => setForm(p => ({ ...p, intervalKm: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11}/> A cada (dias)</label>
                      <input type="number" inputMode="numeric" placeholder="Intervalo dias"
                        value={form.intervalDays}
                        onChange={e => setForm(p => ({ ...p, intervalDays: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                      <History size={12}/> Último serviço
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-amber-700 flex items-center gap-1"><Gauge size={11}/> KM do veículo</label>
                        <input type="number" inputMode="numeric" placeholder="ex: 46000"
                          value={form.lastServiceKm}
                          onChange={e => setForm(p => ({ ...p, lastServiceKm: e.target.value }))}
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-amber-700 flex items-center gap-1"><Calendar size={11}/> Data</label>
                        <input type="date"
                          value={form.lastServiceDate}
                          onChange={e => setForm(p => ({ ...p, lastServiceDate: e.target.value }))}
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        />
                      </div>
                    </div>
                  </div>
                  {formError && <p className="text-xs text-red-600">{formError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(t.id)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-2.5 text-sm font-semibold hover:bg-[#003d4f] transition-colors disabled:opacity-50">
                      <Check size={15}/> Salvar
                    </button>
                    <button onClick={() => { setEditingId(null); setFormError('') }}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <X size={15}/>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Modo visualização ── */
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      t.isActive ? 'bg-[#00475B]/10' : 'bg-gray-100'
                    )}>
                      <Wrench size={16} className={t.isActive ? 'text-[#00475B]' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold truncate', t.isActive ? 'text-gray-800' : 'text-gray-400')}>
                        {t.name}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {t.intervalKm && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Gauge size={10}/> a cada {t.intervalKm.toLocaleString('pt-BR')} km
                          </span>
                        )}
                        {t.intervalDays && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={10}/> a cada {t.intervalDays} dias
                          </span>
                        )}
                        {(t.lastServiceKm || t.lastServiceDate) ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <History size={10}/>
                            {t.lastServiceKm ? `Últ.: ${t.lastServiceKm.toLocaleString('pt-BR')} km` : ''}
                            {t.lastServiceKm && t.lastServiceDate ? ' · ' : ''}
                            {t.lastServiceDate ? formatDate(t.lastServiceDate) : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 flex items-center gap-1">
                            <History size={10}/> Nenhum serviço registrado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(t)}
                        title={t.isActive ? 'Desativar' : 'Ativar'}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
                        {t.isActive
                          ? <ToggleRight size={20} className="text-[#00475B]"/>
                          : <ToggleLeft  size={20} className="text-gray-300"/>
                        }
                      </button>
                      <button onClick={() => startEdit(t)}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors disabled:opacity-50">
                        <Pencil size={15}/>
                      </button>
                      <button onClick={() => removeType(t.id)}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                        <Trash2 size={15}/>
                      </button>
                      {t.description && (
                        <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                          {expandedId === t.id ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedId === t.id && t.description && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && types.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {types.filter(t => t.isActive).length} ativo(s) · {types.filter(t => !t.isActive).length} inativo(s)
        </p>
      )}
    </div>
  )
}
