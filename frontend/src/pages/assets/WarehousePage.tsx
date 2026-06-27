// src/pages/assets/WarehousePage.tsx
// Tela de Gestão do Almoxarifado - Controle de estoque de ferramentas e EPIs.

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  Package,
  ArrowLeftRight,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Loader2,
  User,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge, ASSET_STATUS_BADGE } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi } from '@/lib/api'
import { ASSET_CATEGORY_LABELS, type Asset } from '@/data/mockData'

type ActiveTab = 'inventory' | 'loans' | 'maintenance'

export default function WarehousePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Estados de UI / Navegação ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal Novo Item
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [assetTag, setAssetTag] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('POWER_TOOLS')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [acquisitionValue, setAcquisitionValue] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await assetsApi.list()
      setAssets(data)
    } catch (err: any) {
      console.error('Erro ao buscar estoque:', err)
      setError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  // ── Métricas (KPIs) ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = assets.length
    const available = assets.filter((a) => a.currentStatus === 'AVAILABLE').length
    const loaned = assets.filter((a) => a.currentStatus === 'LOANED').length
    const maintenance = assets.filter((a) => a.currentStatus === 'MAINTENANCE' || a.currentStatus === 'DAMAGED').length
    return { total, available, loaned, maintenance }
  }, [assets])

  // ── Filtros e Busca ────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim()
    return assets.filter((a) => {
      const matchesSearch =
        !q ||
        a.description.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q) ||
        (a.model ?? '').toLowerCase().includes(q) ||
        (a.serialNumber ?? '').toLowerCase().includes(q) ||
        (a.currentBorrowee ?? '').toLowerCase().includes(q)

      const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter
      const matchesStatus = statusFilter === 'ALL' || a.currentStatus === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [assets, search, categoryFilter, statusFilter])

  // Empréstimos Ativos
  const activeLoans = useMemo(() => {
    return assets.filter((a) => a.currentStatus === 'LOANED')
  }, [assets])

  // Itens em Manutenção
  const maintenanceAssets = useMemo(() => {
    return assets.filter((a) => a.currentStatus === 'MAINTENANCE' || a.currentStatus === 'DAMAGED')
  }, [assets])

  // ── Handlers do Modal ──────────────────────────────────────────────────────
  const handleOpenNewModal = () => {
    setAssetTag('')
    setDescription('')
    setCategory('POWER_TOOLS')
    setBrand('')
    setModel('')
    setSerialNumber('')
    setAcquisitionDate('')
    setAcquisitionValue('')
    setLocation('')
    setNotes('')
    setModalError(null)
    setNewModalOpen(true)
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetTag.trim()) {
      setModalError('Código Patrimonial é obrigatório.')
      return
    }
    if (!description.trim()) {
      setModalError('Descrição é obrigatória.')
      return
    }

    setModalSubmitting(true)
    setModalError(null)

    try {
      await assetsApi.create({
        assetTag: assetTag.trim(),
        description: description.trim(),
        category,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : null,
        acquisitionValue: acquisitionValue ? parseFloat(acquisitionValue) : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      })
      setNewModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao salvar novo item:', err)
      setModalError(err?.message ?? 'Ocorreu um erro ao salvar o item.')
    } finally {
      setModalSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Warehouse className="text-brand-primary w-7 h-7" />
            Almoxarifado
          </h1>
          <p className="text-sm text-gray-500">
            Controle do estoque físico, registro de novos patrimônios e acompanhamento de empréstimos e avarias.
          </p>
        </div>

        {isManagerOrAdmin && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button onClick={handleOpenNewModal} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
            <Button onClick={() => navigate('/assets/loans/new')} variant="subtle" className="flex-1 sm:flex-none">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Registrar Saída
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Total de Itens</span>
            <span className="text-2xl font-bold text-gray-900 leading-none mt-1">
              {loading ? '...' : metrics.total}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Disponíveis</span>
            <span className="text-2xl font-bold text-emerald-600 leading-none mt-1">
              {loading ? '...' : metrics.available}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Empréstimos</span>
            <span className="text-2xl font-bold text-blue-600 leading-none mt-1">
              {loading ? '...' : metrics.loaned}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-red-50 rounded-xl text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Manutenção</span>
            <span className="text-2xl font-bold text-red-600 leading-none mt-1">
              {loading ? '...' : metrics.maintenance}
            </span>
          </div>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro ao carregar almoxarifado:</span> {error}
          </div>
          <Button size="sm" variant="ghost" onClick={loadAssets} className="text-red-800 hover:bg-red-100 shrink-0">
            Recarregar
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative',
            activeTab === 'inventory'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Inventário Geral
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative',
            activeTab === 'loans'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Saídas / Empréstimos
          {activeLoans.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full">
              {activeLoans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative',
            activeTab === 'maintenance'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Manutenção
          {maintenanceAssets.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
              {maintenanceAssets.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          <p className="text-sm text-gray-500 font-medium">Buscando informações do estoque...</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Tab 1: Inventário Geral */}
          {activeTab === 'inventory' && (
            <>
              {/* Filtros e Busca */}
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5 pointer-events-none" />
                  <Input
                    placeholder="Pesquisar por PAT, descrição, marca, responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>

                {/* Filtro Categoria */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 hidden sm:inline" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-12 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="ALL">Todas Categorias</option>
                    {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro Status */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 w-full md:w-auto rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="ALL">Todos Status</option>
                    <option value="AVAILABLE">Disponível</option>
                    <option value="LOANED">Emprestado</option>
                    <option value="MAINTENANCE">Em Manutenção</option>
                    <option value="DAMAGED">Danificado</option>
                    <option value="WRITTEN_OFF">Baixado</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Patrimônio */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Patrimônio</th>
                      <th className="px-6 py-4">Descrição do Bem</th>
                      <th className="px-6 py-4">Localização / Obras</th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          Nenhum bem patrimonial encontrado no almoxarifado.
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="block font-bold text-gray-900">{asset.assetTag}</span>
                            <span className="block text-xs text-gray-400 font-medium mt-0.5">
                              {ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-medium text-gray-800 leading-tight">
                              {asset.description}
                            </span>
                            {asset.brand && (
                              <span className="block text-xs text-gray-400 mt-0.5">
                                {asset.brand} {asset.model && `• ${asset.model}`} {asset.serialNumber && `(S/N: ${asset.serialNumber})`}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {asset.location ?? 'Almoxarifado Central'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {asset.currentBorrowee ? (
                              <span className="inline-flex items-center gap-1 text-gray-800 font-semibold">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {asset.currentBorrowee}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={ASSET_STATUS_BADGE[asset.currentStatus]?.variant ?? 'default'} dot>
                              {ASSET_STATUS_BADGE[asset.currentStatus]?.label ?? asset.currentStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            {asset.currentStatus !== 'MAINTENANCE' && asset.currentStatus !== 'WRITTEN_OFF' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate('/assets/maintenance/new')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                              >
                                Relatar Defeito
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tab 2: Empréstimos Ativos */}
          {activeTab === 'loans' && (
            <div className="divide-y divide-gray-100">
              <div className="p-4 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-500">
                  Total de empréstimos operando agora: {activeLoans.length}
                </span>
              </div>

              {activeLoans.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhum empréstimo ativo no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {activeLoans.map((asset) => (
                    <Card key={asset.id} className="p-4 border-gray-100 bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patrimônio</span>
                            <span className="block text-sm font-bold text-gray-900 mt-0.5">{asset.assetTag}</span>
                          </div>
                          <Badge variant="loaned">Emprestado</Badge>
                        </div>

                        <div className="mt-3">
                          <span className="block text-xs font-semibold text-gray-400">Descrição do Item</span>
                          <span className="text-sm font-medium text-gray-800">{asset.description}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-50">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              Responsável
                            </span>
                            <span className="text-xs font-bold text-gray-800 block mt-0.5 truncate">
                              {asset.currentBorrowee}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              Destino
                            </span>
                            <span className="text-xs font-medium text-gray-800 block mt-0.5 truncate">
                              {asset.location ?? 'Obra externa'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Manutenções / Avarias */}
          {activeTab === 'maintenance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Patrimônio</th>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4">Localização Anterior</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                  {maintenanceAssets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        Nenhum equipamento em manutenção no momento! Todos operacionais.
                      </td>
                    </tr>
                  ) : (
                    maintenanceAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900 block">{asset.assetTag}</span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            {ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-800">{asset.description}</span>
                          {asset.brand && (
                            <span className="block text-xs text-gray-400 mt-0.5">
                              {asset.brand} {asset.model && `- ${asset.model}`}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {asset.location ?? 'Almoxarifado Central'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Badge variant={ASSET_STATUS_BADGE[asset.currentStatus]?.variant ?? 'critical'} dot>
                            {ASSET_STATUS_BADGE[asset.currentStatus]?.label ?? asset.currentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Modal de Novo Item (Dialog) ────────────────────────────────────────── */}
      <Dialog
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Novo Item Patrimonial"
        description="Cadastre uma ferramenta, equipamento ou EPI no estoque do almoxarifado."
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{modalError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalAssetTag" required>
                Código Patrimonial
              </Label>
              <Input
                id="modalAssetTag"
                placeholder="Ex: PAT-0001"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>

            <div>
              <Label htmlFor="modalCategory" required>
                Categoria
              </Label>
              <select
                id="modalCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                required
              >
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="modalDescription" required>
              Descrição do Bem
            </Label>
            <Input
              id="modalDescription"
              placeholder="Ex: Furadeira de Impacto Bosch 13mm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalBrand">Marca (opcional)</Label>
              <Input
                id="modalBrand"
                placeholder="Ex: Bosch"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalModel">Modelo (opcional)</Label>
              <Input
                id="modalModel"
                placeholder="Ex: GSB 13 RE"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalSerial">Nº de Série (opcional)</Label>
              <Input
                id="modalSerial"
                placeholder="Ex: BSH-2024"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalLocation">Localização física (opcional)</Label>
              <Input
                id="modalLocation"
                placeholder="Ex: Prateleira A1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalAcquisitionDate">Data de Compra (opcional)</Label>
              <Input
                id="modalAcquisitionDate"
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalAcquisitionValue">Valor de Aquisição (R$)</Label>
              <Input
                id="modalAcquisitionValue"
                type="number"
                step="0.01"
                placeholder="Ex: 485.90"
                value={acquisitionValue}
                onChange={(e) => setAcquisitionValue(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="modalNotes">Observações adicionais (opcional)</Label>
            <Textarea
              id="modalNotes"
              placeholder="Ex: Comprado com garantia estendida de 2 anos."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNewModalOpen(false)}
              disabled={modalSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={modalSubmitting}
            >
              {modalSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Cadastrar Item'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
