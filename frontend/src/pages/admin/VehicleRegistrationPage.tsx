// src/pages/admin/VehicleRegistrationPage.tsx
// Administração › Cadastro de Veículos
// CRUD completo: listar frota, cadastrar, editar e inativar veículos.

import { useState } from 'react'
import {
  Plus, Pencil, X, Check, Car, Gauge,
  Fuel, Palette, FileText, ChevronDown,
  Search, Filter, CheckCircle2, Wrench, Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
type FuelType = 'Flex' | 'Gasolina' | 'Diesel' | 'GNV' | 'Elétrico' | 'Híbrido'

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  color: string | null
  fuelType: string | null
  currentKm: number
  status: VehicleStatus
  notes: string | null
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const FUEL_TYPES: FuelType[] = ['Flex', 'Gasolina', 'Diesel', 'GNV', 'Elétrico', 'Híbrido']

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:      { label: 'Ativo',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  MAINTENANCE: { label: 'Manutenção',  color: 'bg-amber-100 text-amber-700',     icon: Wrench },
  INACTIVE:    { label: 'Inativo',     color: 'bg-gray-100 text-gray-500',       icon: Ban },
}

const EMPTY_FORM = {
  licensePlate: '', brand: '', model: '', year: String(new Date().getFullYear()),
  color: '', fuelType: 'Flex', currentKm: '0', notes: '',
}

// ── Mock data (substituir por fetch real) ─────────────────────────────────────

const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', licensePlate: 'ABC1D23', brand: 'Ford',       model: 'Ranger',  year: 2022, color: 'Branco', fuelType: 'Diesel', currentKm: 48320, status: 'ACTIVE',      notes: null },
  { id: 'v2', licensePlate: 'XYZ5E67', brand: 'Volkswagen', model: 'Amarok',  year: 2021, color: 'Prata',  fuelType: 'Diesel', currentKm: 72100, status: 'MAINTENANCE', notes: 'Aguardando troca de correia dentada' },
  { id: 'v3', licensePlate: 'QRS9H12', brand: 'Toyota',     model: 'Hilux',   year: 2023, color: 'Preto',  fuelType: 'Diesel', currentKm: 12450, status: 'ACTIVE',      notes: null },
  { id: 'v4', licensePlate: 'DEF2G34', brand: 'Fiat',       model: 'Strada',  year: 2020, color: 'Cinza',  fuelType: 'Flex',   currentKm: 91200, status: 'INACTIVE',   notes: 'Vendido em 01/2026' },
]

// ── Componente principal ───────────────────────────────────────────────────────

export default function VehicleRegistrationPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'ALL'>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtered = vehicles.filter(v => {
    const matchSearch = !search ||
      v.licensePlate.includes(search.toUpperCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || v.status === filterStatus
    return matchSearch && matchStatus
  })

  // ── Validação ──────────────────────────────────────────────────────────────

  function validate() {
    const e: Record<string, string> = {}
    if (!form.licensePlate.trim()) e.licensePlate = 'Placa obrigatória'
    if (!/^[A-Za-z]{3}\d[A-Za-z0-9]\d{2}$/.test(form.licensePlate.replace(/[-\s]/g, '')))
      e.licensePlate = 'Placa inválida (ex: ABC1D23 ou ABC1234)'
    if (!form.brand.trim())  e.brand  = 'Marca obrigatória'
    if (!form.model.trim())  e.model  = 'Modelo obrigatório'
    if (!form.year || Number(form.year) < 1990 || Number(form.year) > new Date().getFullYear() + 1)
      e.year = 'Ano inválido'
    if (Number(form.currentKm) < 0) e.currentKm = 'KM não pode ser negativo'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Salvar (criar ou editar) ───────────────────────────────────────────────

  function handleSave() {
    if (!validate()) return

    const plate = form.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (editingId) {
      setVehicles(prev => prev.map(v => v.id === editingId ? {
        ...v,
        licensePlate: plate,
        brand:        form.brand,
        model:        form.model,
        year:         Number(form.year),
        color:        form.color || null,
        fuelType:     form.fuelType || null,
        currentKm:    Number(form.currentKm),
        notes:        form.notes || null,
      } : v))
    } else {
      const newVehicle: Vehicle = {
        id:           `v${Date.now()}`,
        licensePlate: plate,
        brand:        form.brand,
        model:        form.model,
        year:         Number(form.year),
        color:        form.color || null,
        fuelType:     form.fuelType || null,
        currentKm:    Number(form.currentKm),
        status:       'ACTIVE',
        notes:        form.notes || null,
      }
      setVehicles(prev => [newVehicle, ...prev])
    }

    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(v: Vehicle) {
    setEditingId(v.id)
    setForm({
      licensePlate: v.licensePlate,
      brand:        v.brand,
      model:        v.model,
      year:         String(v.year),
      color:        v.color ?? '',
      fuelType:     v.fuelType ?? 'Flex',
      currentKm:    String(v.currentKm),
      notes:        v.notes ?? '',
    })
    setErrors({})
    setShowForm(true)
    setExpandedId(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function toggleStatus(id: string, newStatus: VehicleStatus) {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v))
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatPlate(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
    if (clean.length > 4) return `${clean.slice(0, 3)}-${clean.slice(3)}`
    return clean
  }

  const f = (key: keyof typeof form, val: string) => setForm(p => ({ ...p, [key]: val }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="text-[#00475B]" size={26} />
            Cadastro de Veículos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie a frota da 3T Engenharia — {vehicles.filter(v => v.status === 'ACTIVE').length} veículo(s) ativo(s)
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 rounded-xl bg-[#00475B] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#003d4f] active:scale-[.98] transition-all shadow shrink-0"
          >
            <Plus size={16} /> Novo Veículo
          </button>
        )}
      </div>

      {/* Formulário de cadastro / edição */}
      {showForm && (
        <div className="rounded-2xl border border-[#00475B]/20 bg-[#00475B]/5 p-5 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-[#00475B]">
            {editingId ? '✏️ Editar Veículo' : '🚗 Novo Veículo'}
          </h2>

          {/* Linha 1 — Placa + Marca + Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Placa *" error={errors.licensePlate}>
              <input
                placeholder="ABC-1D23"
                value={form.licensePlate}
                onChange={e => f('licensePlate', formatPlate(e.target.value))}
                className={inputCls(!!errors.licensePlate)}
                maxLength={8}
              />
            </Field>
            <Field label="Marca *" error={errors.brand}>
              <input placeholder="Ford" value={form.brand} onChange={e => f('brand', e.target.value)} className={inputCls(!!errors.brand)} />
            </Field>
            <Field label="Modelo *" error={errors.model}>
              <input placeholder="Ranger" value={form.model} onChange={e => f('model', e.target.value)} className={inputCls(!!errors.model)} />
            </Field>
          </div>

          {/* Linha 2 — Ano + Cor + Combustível + KM Atual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Ano *" error={errors.year}>
              <input type="number" inputMode="numeric" placeholder="2023" value={form.year} onChange={e => f('year', e.target.value)} className={inputCls(!!errors.year)} />
            </Field>
            <Field label="Cor">
              <div className="relative">
                <Palette size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Branco" value={form.color} onChange={e => f('color', e.target.value)} className={`${inputCls(false)} pl-8`} />
              </div>
            </Field>
            <Field label="Combustível">
              <div className="relative">
                <Fuel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={form.fuelType} onChange={e => f('fuelType', e.target.value)} className={`${inputCls(false)} pl-8 appearance-none`}>
                  {FUEL_TYPES.map(ft => <option key={ft}>{ft}</option>)}
                </select>
              </div>
            </Field>
            <Field label="KM Atual *" error={errors.currentKm}>
              <div className="relative">
                <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" inputMode="numeric" placeholder="0" value={form.currentKm} onChange={e => f('currentKm', e.target.value)} className={`${inputCls(!!errors.currentKm)} pl-8`} />
              </div>
            </Field>
          </div>

          {/* Observações */}
          <Field label="Observações">
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                placeholder="Ex: Aguardando troca de correia dentada..."
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                rows={2}
                className={`${inputCls(false)} pl-8 resize-none`}
              />
            </div>
          </Field>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-3 text-sm font-semibold hover:bg-[#003d4f] transition-colors">
              <Check size={16} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Veículo'}
            </button>
            <button onClick={cancelForm}
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-gray-600 hover:bg-gray-50 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar placa, marca ou modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as VehicleStatus | 'ALL')}
            className="rounded-xl border border-gray-200 bg-white pl-9 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="MAINTENANCE">Em Manutenção</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>
      </div>

      {/* Lista de veículos */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <Car className="mx-auto text-gray-300 mb-3" size={36} />
          <p className="text-sm text-gray-400 font-medium">Nenhum veículo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => {
            const cfg = STATUS_CONFIG[v.status]
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === v.id

            return (
              <div key={v.id}
                className={cn('rounded-2xl border bg-white shadow-sm overflow-hidden transition-all', v.status === 'INACTIVE' && 'opacity-60')}>

                {/* Cabeçalho do card */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Ícone */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    v.status === 'ACTIVE' ? 'bg-[#00475B]/10' : v.status === 'MAINTENANCE' ? 'bg-amber-100' : 'bg-gray-100')}>
                    <Car size={18} className={v.status === 'ACTIVE' ? 'text-[#00475B]' : v.status === 'MAINTENANCE' ? 'text-amber-600' : 'text-gray-400'} />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 tracking-wider text-sm">{v.licensePlate.slice(0, 3)}-{v.licensePlate.slice(3)}</span>
                      <span className="text-gray-500 text-sm">{v.brand} {v.model} {v.year}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>
                        <StatusIcon size={10} />{cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Gauge size={10} />{v.currentKm.toLocaleString('pt-BR')} km
                      </span>
                      {v.fuelType && <span className="text-xs text-gray-400">{v.fuelType}</span>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                      <ChevronDown size={15} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    <button onClick={() => startEdit(v)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>

                {/* Painel expandido */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                    {/* Detalhes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {v.color && <Detail label="Cor" value={v.color} />}
                    </div>
                    {v.notes && (
                      <p className="text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">{v.notes}</p>
                    )}
                    {/* Mudar status */}
                    <div className="flex gap-2 pt-1">
                      {v.status !== 'ACTIVE' && (
                        <button onClick={() => toggleStatus(v.id, 'ACTIVE')}
                          className="flex items-center gap-1.5 text-xs rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-medium hover:bg-emerald-700 transition-colors">
                          <CheckCircle2 size={12} /> Ativar
                        </button>
                      )}
                      {v.status !== 'MAINTENANCE' && (
                        <button onClick={() => toggleStatus(v.id, 'MAINTENANCE')}
                          className="flex items-center gap-1.5 text-xs rounded-lg bg-amber-500 text-white px-3 py-1.5 font-medium hover:bg-amber-600 transition-colors">
                          <Wrench size={12} /> Em Manutenção
                        </button>
                      )}
                      {v.status !== 'INACTIVE' && (
                        <button onClick={() => toggleStatus(v.id, 'INACTIVE')}
                          className="flex items-center gap-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 px-3 py-1.5 font-medium hover:bg-gray-100 transition-colors">
                          <Ban size={12} /> Inativar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contagem */}
      {vehicles.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {vehicles.filter(v => v.status === 'ACTIVE').length} ativo(s) ·{' '}
          {vehicles.filter(v => v.status === 'MAINTENANCE').length} em manutenção ·{' '}
          {vehicles.filter(v => v.status === 'INACTIVE').length} inativo(s)
        </p>
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors',
    hasError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#00475B]/30',
  )
}
