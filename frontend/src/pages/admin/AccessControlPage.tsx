// src/pages/admin/AccessControlPage.tsx
// Tela de gestão de Perfis de Acesso dinâmicos — o gestor cria perfis livremente
// e, para cada página do sistema, escolhe um dos 4 níveis de acesso (ou 2, para
// páginas sem conceito de "próprio registro").

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  Lock,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { accessProfilesApi, type ApiAccessProfile, type ApiPageDefinition } from '@/lib/api'
import {
  PAGE_DEFINITIONS as FALLBACK_PAGE_DEFINITIONS,
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_DESCRIPTIONS,
  type AccessLevel,
} from '@/lib/accessControl'

const FOUR_TIER_ORDER: AccessLevel[] = ['WRITE_ALL', 'WRITE_OWN', 'READ_ALL', 'READ_OWN']
const TWO_TIER_ORDER: AccessLevel[] = ['WRITE_ALL', 'READ_ALL']

function buildEmptyPermMap(pages: ApiPageDefinition[]): Record<string, AccessLevel> {
  const map: Record<string, AccessLevel> = {}
  for (const p of pages) map[p.key] = 'NONE'
  return map
}

export default function AccessControlPage() {
  const { isAdminType: currentUserIsAdminType } = useAuth()

  const [profiles, setProfiles] = useState<ApiAccessProfile[]>([])
  const [pages, setPages] = useState<ApiPageDefinition[]>(FALLBACK_PAGE_DEFINITIONS)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  // ── Estado do formulário do perfil selecionado ─────────────────────────────
  const [name, setName] = useState('')
  const [isAdminType, setIsAdminType] = useState(false)
  const [permMap, setPermMap] = useState<Record<string, AccessLevel>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const [profilesData, pagesData] = await Promise.all([
        accessProfilesApi.list(),
        accessProfilesApi.listPages(),
      ])
      setProfiles(profilesData)
      setPages(pagesData)
    } catch (err: any) {
      console.error('Erro ao carregar perfis de acesso:', err)
      setFetchError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const groupedPages = useMemo(() => {
    const groups = new Map<string, ApiPageDefinition[]>()
    for (const p of pages) {
      const list = groups.get(p.group) ?? []
      list.push(p)
      groups.set(p.group, list)
    }
    return Array.from(groups.entries())
  }, [pages])

  const selectedProfile = selectedId && selectedId !== 'new' ? profiles.find((p) => p.id === selectedId) ?? null : null

  const handleSelectProfile = (profile: ApiAccessProfile) => {
    setSelectedId(profile.id)
    setName(profile.name)
    setIsAdminType(profile.isAdminType)
    const map = buildEmptyPermMap(pages)
    for (const perm of profile.permissions) map[perm.pageKey] = perm.level
    setPermMap(map)
    setSaveError(null)
  }

  const handleOpenNew = () => {
    setSelectedId('new')
    setName('')
    setIsAdminType(false)
    setPermMap(buildEmptyPermMap(pages))
    setSaveError(null)
  }

  const togglePageAccess = (pageKey: string, checked: boolean) => {
    setPermMap((prev) => ({
      ...prev,
      [pageKey]: checked ? 'READ_ALL' : 'NONE',
    }))
  }

  const setPageLevel = (pageKey: string, level: AccessLevel) => {
    setPermMap((prev) => ({ ...prev, [pageKey]: level }))
  }

  const isMaster = selectedProfile?.isMaster ?? false
  const isReadOnlyForm = isMaster

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Dê um nome ao perfil de acesso.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const permissions = Object.entries(permMap)
      .filter(([, level]) => level !== 'NONE')
      .map(([pageKey, level]) => ({ pageKey, level }))

    try {
      if (selectedId === 'new') {
        const created = await accessProfilesApi.create({ name: name.trim(), isAdminType, permissions })
        await loadData()
        setSelectedId(created.id)
      } else if (selectedId) {
        await accessProfilesApi.edit(selectedId, { name: name.trim(), isAdminType, permissions })
        await loadData()
      }
    } catch (err: any) {
      console.error('Erro ao salvar perfil de acesso:', err)
      setSaveError(err?.message ?? 'Falha ao salvar o perfil de acesso.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProfile) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await accessProfilesApi.delete(selectedProfile.id)
      setDeleteOpen(false)
      setSelectedId(null)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao excluir perfil de acesso:', err)
      setDeleteError(err?.message ?? 'Não foi possível excluir este perfil.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="text-brand-primary w-7 h-7" />
            Controle de Acesso
          </h1>
          <p className="text-sm text-gray-500">
            Crie perfis de acesso e defina, página por página, o nível de permissão de cada um.
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Perfil
        </Button>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          <p className="text-sm text-gray-500 font-medium">Buscando perfis de acesso...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* ── Lista de perfis ── */}
          <Card className="overflow-hidden divide-y divide-gray-50">
            {profiles.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">Nenhum perfil cadastrado.</p>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3',
                    selectedId === profile.id ? 'bg-brand-primary/5' : 'hover:bg-gray-50',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                    profile.isAdminType ? 'bg-red-50 text-red-500' : 'bg-brand-primary/10 text-brand-primary',
                  )}>
                    {profile.isMaster ? <Lock size={16} /> : profile.isAdminType ? <ShieldCheck size={16} /> : <Shield size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{profile.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {profile.isMaster && <Badge variant="critical">Master</Badge>}
                      {!profile.isMaster && profile.isAdminType && <Badge variant="critical">Admin</Badge>}
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Users size={11} />
                        {profile._count.users}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </Card>

          {/* ── Editor do perfil selecionado ── */}
          {selectedId === null ? (
            <Card className="p-12 text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              Selecione um perfil à esquerda ou crie um novo para configurar as permissões.
            </Card>
          ) : (
            <Card className="p-6 space-y-6">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="font-semibold">{saveError}</p>
                </div>
              )}

              {isMaster && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-xs text-amber-700">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="font-semibold">
                    Este é o perfil administrador raiz do sistema — imutável e com acesso irrestrito a todas as páginas. Não pode ser editado ou excluído.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[220px]">
                  <Label htmlFor="profileName" required>
                    Nome do Perfil
                  </Label>
                  <Input
                    id="profileName"
                    placeholder="Ex: Colaborador Nível 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 h-11"
                    disabled={isReadOnlyForm}
                    required
                  />
                </div>

                {currentUserIsAdminType && (
                  <div className="flex items-center gap-2 pb-3">
                    <input
                      id="isAdminType"
                      type="checkbox"
                      checked={isAdminType}
                      onChange={(e) => setIsAdminType(e.target.checked)}
                      disabled={isReadOnlyForm}
                      className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                    />
                    <Label htmlFor="isAdminType" className="cursor-pointer select-none">
                      Perfil administrador (acesso irrestrito a todas as páginas)
                    </Label>
                  </div>
                )}

                {!isMaster && selectedId !== 'new' && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 mb-0.5"
                    onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
                    disabled={(selectedProfile?._count.users ?? 0) > 0}
                    title={(selectedProfile?._count.users ?? 0) > 0 ? 'Não é possível excluir: há usuários vinculados a este perfil.' : undefined}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Perfil
                  </Button>
                )}
              </div>

              {isAdminType && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                  Perfis administradores ignoram a lista abaixo — o acesso é sempre total. A configuração de páginas continua disponível caso o perfil deixe de ser administrador no futuro.
                </div>
              )}

              {/* ── Checklist de páginas ── */}
              <div className="space-y-5">
                {groupedPages.map(([group, groupPages]) => (
                  <div key={group}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{group}</h3>
                    <div className="space-y-1.5">
                      {groupPages.map((page) => {
                        const level = permMap[page.key] ?? 'NONE'
                        const hasAccess = level !== 'NONE'
                        const tiers = page.supportsOwnScope ? FOUR_TIER_ORDER : TWO_TIER_ORDER
                        return (
                          <div
                            key={page.key}
                            className={cn(
                              'rounded-xl border transition-colors',
                              hasAccess ? 'border-brand-primary/20 bg-brand-primary/[0.03]' : 'border-gray-100',
                            )}
                          >
                            <label className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={(e) => togglePageAccess(page.key, e.target.checked)}
                                disabled={isReadOnlyForm}
                                className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                              />
                              <span className="text-sm font-semibold text-gray-800 flex-1">{page.label}</span>
                            </label>

                            {hasAccess && (
                              <div className="px-3.5 pb-3 pl-10 flex flex-wrap gap-2">
                                {tiers.map((tier) => (
                                  <button
                                    key={tier}
                                    type="button"
                                    disabled={isReadOnlyForm}
                                    onClick={() => setPageLevel(page.key, tier)}
                                    title={ACCESS_LEVEL_DESCRIPTIONS[tier]}
                                    className={cn(
                                      'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
                                      level === tier
                                        ? 'bg-brand-primary text-white border-brand-primary'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand-primary/40',
                                    )}
                                  >
                                    {ACCESS_LEVEL_LABELS[tier]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {!isReadOnlyForm && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {selectedId === 'new' ? 'Criar Perfil' : 'Salvar Alterações'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Modal de Confirmação de Exclusão ── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o perfil de acesso "${selectedProfile?.name}"?`}
      >
        <div className="space-y-4 pt-2">
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{deleteError}</p>
            </div>
          )}
          <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
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
