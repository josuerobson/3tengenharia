// src/pages/admin/WorksitesPage.tsx
// Tela de gerenciamento de obras e centros de custo (CRUD completo).
// Acesso restrito a administradores (ADMIN) e gestores (MANAGER).

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { worksitesApi, type ApiWorksite } from '@/lib/api'

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatDateForInput(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export default function WorksitesPage() {
  const navigate = useNavigate()
  const { canReadPage, canWritePage } = useAuth()
  const isAuthorized = canReadPage('admin.worksites')
  const canManage = canWritePage('admin.worksites')

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Estados de Filtro/Pesquisa ─────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  // ── Estados de Modal (Criação/Edição) ──────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editingWorksite, setEditingWorksite] = useState<ApiWorksite | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // ── Estados de Modal (Exclusão) ────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingWorksite, setDeletingWorksite] = useState<ApiWorksite | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true)
      setFetchError(null)
      const data = await worksitesApi.list()
      setWorksites(data)
    } catch (err: any) {
      console.error('Erro ao carregar obras:', err)
      setFetchError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      loadData()
    }
  }, [isAuthorized, loadData])

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filteredWorksites = useMemo(() => {
    const q = search.toLowerCase().trim()
    return worksites.filter((w) => {
      const matchesSearch =
        !q ||
        w.code.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        (w.city ?? '').toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && w.isActive) ||
        (statusFilter === 'INACTIVE' && !w.isActive)

      return matchesSearch && matchesStatus
    })
  }, [worksites, search, statusFilter])

  // ── Form Handlers ──────────────────────────────────────────────────────────
  const handleOpenNewForm = () => {
    setEditingWorksite(null)
    setCode('')
    setName('')
    setAddress('')
    setCity('')
    setState('')
    setIsActive(true)
    setStartDate('')
    setEndDate('')
    setFormError(null)
    setFormOpen(true)
  }

  const handleOpenEditForm = (worksite: ApiWorksite) => {
    setEditingWorksite(worksite)
    setCode(worksite.code)
    setName(worksite.name)
    setAddress(worksite.address ?? '')
    setCity(worksite.city ?? '')
    setState(worksite.state ?? '')
    setIsActive(worksite.isActive)
    setStartDate(formatDateForInput(worksite.startDate))
    setEndDate(formatDateForInput(worksite.endDate))
    setFormError(null)
    setFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setFormError('Código da obra é obrigatório.')
      return
    }
    if (!name.trim()) {
      setFormError('Nome da obra é obrigatório.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    const payload = {
      code: code.trim(),
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim().toUpperCase() || null,
      isActive,
      startDate: startDate || null,
      endDate: endDate || null,
    }

    try {
      if (editingWorksite) {
        await worksitesApi.update(editingWorksite.id, payload)
      } else {
        await worksitesApi.create(payload)
      }
      setFormOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao salvar obra:', err)
      setFormError(err?.message ?? 'Falha ao salvar informações da obra.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // ── Delete Handlers ────────────────────────────────────────────────────────
  const handleOpenDelete = (worksite: ApiWorksite) => {
    setDeletingWorksite(worksite)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!deletingWorksite) return

    setDeleteSubmitting(true)
    setDeleteError(null)

    try {
      await worksitesApi.delete(deletingWorksite.id)
      setDeleteOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao excluir obra:', err)
      setDeleteError(err?.message ?? 'Não foi possível excluir esta obra.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // Restrição de Acesso RBAC
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Acesso Restrito</h3>
        <p className="text-sm text-gray-500 mb-6">
          Você não possui privilégios administrativos para gerenciar o cadastro de obras.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="w-full">
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-brand-primary w-7 h-7" />
            Cadastro de Obras
          </h1>
          <p className="text-sm text-gray-500">
            Gerencie os centros de custo e obras ativas da empresa para rateio de equipes, ferramentas e horas.
          </p>
        </div>

        {canManage && (
          <Button onClick={handleOpenNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Obra
          </Button>
        )}
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro ao carregar dados:</span> {fetchError}
          </div>
          <Button size="sm" variant="ghost" onClick={loadData} className="text-red-800 hover:bg-red-100 shrink-0">
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Busca e Filtros */}
      <Card className="p-4 bg-white border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5 pointer-events-none" />
          <Input
            placeholder="Buscar por código de obra, nome ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-12 w-full sm:w-48 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
          >
            <option value="ALL">Todos Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </Card>

      {/* Lista de Obras */}
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          <p className="text-sm text-gray-500 font-medium">Buscando cadastro de obras...</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Nome da Obra / CC</th>
                  <th className="px-6 py-4">Localidade</th>
                  <th className="px-6 py-4">Cronograma</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                {filteredWorksites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      Nenhuma obra cadastrada ou encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredWorksites.map((worksite) => (
                    <tr key={worksite.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="brand" className="font-bold text-xs uppercase px-2.5 py-1">
                          {worksite.code}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-bold text-gray-900 leading-tight">
                          {worksite.name}
                        </span>
                        {worksite.address && (
                          <span className="block text-xs text-gray-400 mt-0.5 truncate max-w-sm">
                            {worksite.address}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {worksite.city ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {worksite.city} {worksite.state && `- ${worksite.state}`}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <div>
                            <span className="block font-medium">
                              Início: {formatDate(worksite.startDate)}
                            </span>
                            {worksite.endDate && (
                              <span className="block text-gray-400 mt-0.5">
                                Fim: {formatDate(worksite.endDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant={worksite.isActive ? 'active' : 'inactive'} dot>
                          {worksite.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleOpenEditForm(worksite)}
                            title="Editar Obra"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500 hover:text-brand-primary" />
                          </Button>
                          )}
                          {canManage && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => handleOpenDelete(worksite)}
                              title="Excluir Obra"
                            >
                              <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal de Formulário (Criar / Editar) ────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingWorksite ? 'Editar Cadastro de Obra' : 'Cadastrar Nova Obra'}
        description="Preencha os campos abaixo para configurar o centro de custo e a obra."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label htmlFor="worksiteCode" required>
                Código / CC
              </Label>
              <Input
                id="worksiteCode"
                placeholder="Ex: OB-0042"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="worksiteName" required>
                Nome da Obra
              </Label>
              <Input
                id="worksiteName"
                placeholder="Ex: Condomínio Belle Vue"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="worksiteAddress">Endereço (opcional)</Label>
            <Input
              id="worksiteAddress"
              placeholder="Ex: Av. das Nações, 1400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="worksiteCity">Cidade (opcional)</Label>
              <Input
                id="worksiteCity"
                placeholder="Ex: Belo Horizonte"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="worksiteState">UF (opcional)</Label>
              <Input
                id="worksiteState"
                placeholder="Ex: MG"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1.5 h-11 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="worksiteStartDate">Data de Início (opcional)</Label>
              <Input
                id="worksiteStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="worksiteEndDate">Data de Término (opcional)</Label>
              <Input
                id="worksiteEndDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="worksiteIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
            />
            <Label htmlFor="worksiteIsActive" className="cursor-pointer select-none">
              Obra Ativa (aceita apontamentos e ferramentas)
            </Label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={formSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formSubmitting}>
              {formSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Obra'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Confirmação de Exclusão ───────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o cadastro da obra "${deletingWorksite?.name}" (${deletingWorksite?.code})?`}
      >
        <div className="space-y-4 pt-2">
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{deleteError}</p>
            </div>
          )}

          <p className="text-sm text-gray-500">
            Esta ação não pode ser desfeita. A exclusão física só será permitida caso a obra não possua colaboradores lotados ou lançamentos de horas associados.
          </p>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
