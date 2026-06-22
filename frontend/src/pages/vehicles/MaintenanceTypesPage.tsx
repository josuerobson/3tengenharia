// src/pages/vehicles/MaintenanceTypesPage.tsx
// Cadastro dinâmico de tipos de manutenção por veículo.
// CRUD completo: listar, criar, editar inline e desativar/remover.

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Check,
  Wrench, Gauge, Calendar, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface MaintenanceType {
  id: string
  name: string
  description: string | null
  isActive: boolean
  intervalKm: number | null
  intervalDays: number | null
}

// ── Mock de veículos (substituir por fetch real) ───────────────────────────────

const MOCK_VEHICLES = [
  { id: 'v1', label: 'ABC-1D23 — Ford Ranger 2022' },
  { id: 'v2', label: 'XYZ-5E67 — Volkswagen Amarok 2021' },
  { id: 'v3', label: 'QRS-9H12 — Toyota Hilux 2023' },
]

// ── Mock inicial de tipos por veículo ─────────────────────────────────────────

const INITIAL_TYPES: Record<string, MaintenanceType[]> = {
  v1: [
    { id: 't1', name: 'Troca de óleo do motor', description: 'Óleo 5W30 sintético + filtro', isActive: true, intervalKm: 10000, intervalDays: 180 },
    { id: 't2', name: 'Óleo da caixa de câmbio', description: null, isActive: true, intervalKm: 40000, intervalDays: null },
    { id: 't3', name: 'Correia dentada', description: 'Substituir conjunto correia + tensor', isActive: true, intervalKm: 60000, intervalDays: null },
    { id: 't4', name: 'Filtro de combustível', description: null, isActive: false, intervalKm: 20000, intervalDays: null },
  ],
  v2: [],
  v3: [],
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function MaintenanceTypesPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(MOCK_VEHICLES[0].id)
  const [typesByVehicle, setTypesByVehicle] = useState(INITIAL_TYPES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    intervalKm: '',
    intervalDays: '',
  })
  const [formError, setFormError] = useState('')

  const types = typesByVehicle[selectedVehicleId] ?? []
  const selectedVehicle = MOCK_VEHICLES.find(v => v.id === selectedVehicleId)!

  // ── Criar ──────────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.')
      return
    }
    const newType: MaintenanceType = {
      id:          `t${Date.now()}`,
      name:        form.name.trim(),
      description: form.description.trim() || null,
      isActive:    true,
      intervalKm:   form.intervalKm   ? parseInt(form.intervalKm)   : null,
      intervalDays: form.intervalDays ? parseInt(form.intervalDays) : null,
    }
    setTypesByVehicle(prev => ({
      ...prev,
      [selectedVehicleId]: [...(prev[selectedVehicleId] ?? []), newType],
    }))
    setForm({ name: '', description: '', intervalKm: '', intervalDays: '' })
    setFormError('')
    setShowForm(false)
  }

  // ── Editar inline ──────────────────────────────────────────────────────────

  function startEdit(t: MaintenanceType) {
    setEditingId(t.id)
    setForm({
      name:         t.name,
      description:  t.description ?? '',
      intervalKm:   t.intervalKm?.toString()   ?? '',
      intervalDays: t.intervalDays?.toString() ?? '',
    })
    setFormError('')
  }

  function saveEdit(id: string) {
    if (!form.name.trim()) { setFormError('Nome obrigatório.'); return }
    setTypesByVehicle(prev => ({
      ...prev,
      [selectedVehicleId]: prev[selectedVehicleId].map(t =>
        t.id === id ? {
          ...t,
          name:         form.name.trim(),
          description:  form.description.trim() || null,
          intervalKm:   form.intervalKm   ? parseInt(form.intervalKm)   : null,
          intervalDays: form.intervalDays ? parseInt(form.intervalDays) : null,
        } : t
      ),
    }))
    setEditingId(null)
    setFormError('')
  }

  // ── Toggle ativo ───────────────────────────────────────────────────────────

  function toggleActive(id: string) {
    setTypesByVehicle(prev => ({
      ...prev,
      [selectedVehicleId]: prev[selectedVehicleId].map(t =>
        t.id === id ? { ...t, isActive: !t.isActive } : t
      ),
    }))
  }

  // ── Remover ────────────────────────────────────────────────────────────────

  function removeType(id: string) {
    setTypesByVehicle(prev => ({
      ...prev,
      [selectedVehicleId]: prev[selectedVehicleId].filter(t => t.id !== id),
    }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="text-[#00475B]" size={26} />
          Tipos de Manutenção
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre os serviços de manutenção preventiva de cada veículo da frota.
        </p>
      </div>

      {/* Seletor de veículo */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Veículo
        </label>
        <select
          value={selectedVehicleId}
          onChange={e => { setSelectedVehicleId(e.target.value); setShowForm(false); setEditingId(null) }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
        >
          {MOCK_VEHICLES.map(v => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Botão adicionar */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-3 font-semibold text-sm hover:bg-[#003d4f] active:scale-[.98] transition-all shadow"
        >
          <Plus size={18} />
          Novo Tipo de Manutenção
        </button>
      )}

      {/* Formulário de criação */}
      {showForm && (
        <div className="rounded-2xl border border-[#00475B]/20 bg-[#00475B]/5 p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-[#00475B]">Novo tipo para: {selectedVehicle.label.split('—')[1]?.trim()}</p>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 flex items-center gap-1"><Gauge size={12} /> Intervalo (km)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="ex: 10000"
                value={form.intervalKm}
                onChange={e => setForm(p => ({ ...p, intervalKm: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> Intervalo (dias)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="ex: 180"
                value={form.intervalDays}
                onChange={e => setForm(p => ({ ...p, intervalDays: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-3 text-sm font-semibold hover:bg-[#003d4f] transition-colors"
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

      {/* Lista de tipos */}
      {types.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <Wrench className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm text-gray-400 font-medium">Nenhum tipo cadastrado para este veículo.</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Novo Tipo" para começar.</p>
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
                    <input type="number" inputMode="numeric" placeholder="Intervalo km"
                      value={form.intervalKm}
                      onChange={e => setForm(p => ({ ...p, intervalKm: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                    />
                    <input type="number" inputMode="numeric" placeholder="Intervalo dias"
                      value={form.intervalDays}
                      onChange={e => setForm(p => ({ ...p, intervalDays: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00475B]/30"
                    />
                  </div>
                  {formError && <p className="text-xs text-red-600">{formError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(t.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00475B] text-white py-2.5 text-sm font-semibold hover:bg-[#003d4f] transition-colors">
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
                    {/* Ícone e nome */}
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
                      {(t.intervalKm || t.intervalDays) && (
                        <div className="flex items-center gap-3 mt-0.5">
                          {t.intervalKm && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Gauge size={10}/>{t.intervalKm.toLocaleString('pt-BR')} km
                            </span>
                          )}
                          {t.intervalDays && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar size={10}/>{t.intervalDays} dias
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(t.id)}
                        title={t.isActive ? 'Desativar' : 'Ativar'}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        {t.isActive
                          ? <ToggleRight size={20} className="text-[#00475B]"/>
                          : <ToggleLeft  size={20} className="text-gray-300"/>
                        }
                      </button>
                      <button onClick={() => startEdit(t)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Pencil size={15}/>
                      </button>
                      <button onClick={() => removeType(t.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
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

                  {/* Descrição expandida */}
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

      {/* Contagem */}
      {types.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {types.filter(t => t.isActive).length} ativo(s) · {types.filter(t => !t.isActive).length} inativo(s)
        </p>
      )}
    </div>
  )
}
