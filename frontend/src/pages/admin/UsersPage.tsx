// src/pages/admin/UsersPage.tsx
// Tela de gerenciamento de usuários (CRUD completo).
// Acesso restrito a administradores (ADMIN).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi, type ApiUser, type ApiJobFunction } from '@/lib/api'

type RoleFilter = 'ALL' | 'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  COLLABORATOR: 'Colaborador',
  MANAGER_WORKSITE: 'Gestor de Obra',
  MANAGER_HR: 'Gestor de RH',
  MANAGER_WAREHOUSE: 'Gestor de Almoxarifado',
}

const ROLE_BADGE_VARIANTS: Record<string, 'default' | 'brand' | 'critical' | null> = {
  ADMIN: 'critical',
  COLLABORATOR: 'default',
  MANAGER_WORKSITE: 'brand',
  MANAGER_HR: 'brand',
  MANAGER_WAREHOUSE: 'brand',
}

const formatCpf = (val: string) => {
  const digits = val.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isAuthorized = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [users, setUsers] = useState<ApiUser[]>([])
  const [jobFunctions, setJobFunctions] = useState<ApiJobFunction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Estados de Filtro/Pesquisa ─────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  // ── Estados de Modal (Criação/Edição) ──────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'COLLABORATOR' | 'MANAGER_WORKSITE' | 'MANAGER_HR' | 'MANAGER_WAREHOUSE'>('COLLABORATOR')
  const [isActive, setIsActive] = useState(true)
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [isCustomPosition, setIsCustomPosition] = useState(false)
  const [customPosition, setCustomPosition] = useState('')
  const [registration, setRegistration] = useState('')
  const [cnhExpirationDate, setCnhExpirationDate] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // ── Estados de Modal (Exclusão) ────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<ApiUser | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Estados de Modal (Gerenciar Funções) ───────────────────────────────────
  const [jobFunctionModalOpen, setJobFunctionModalOpen] = useState(false)
  const [newJobFunctionName, setNewJobFunctionName] = useState('')
  const [editingJobFunctionId, setEditingJobFunctionId] = useState<string | null>(null)
  const [editingJobFunctionName, setEditingJobFunctionName] = useState('')
  const [jobFunctionActionError, setJobFunctionActionError] = useState<string | null>(null)
  const [jobFunctionActionLoading, setJobFunctionActionLoading] = useState<string | null>(null)

  // ── Funções ativas disponíveis para o select ───────────────────────────────
  // Inclui a função atual do usuário em edição mesmo se ela tiver sido desativada,
  // para não "sumir" do dropdown e o admin salvar sem querer com outro valor.
  const activeJobFunctions = useMemo(() => {
    const opts = jobFunctions.filter((f) => f.isActive)
    if (position && !opts.some((f) => f.name === position)) {
      const current = jobFunctions.find((f) => f.name === position)
      opts.unshift(current ?? { id: '__current__', name: position, isActive: false, createdAt: '', updatedAt: '' })
    }
    return opts
  }, [jobFunctions, position])

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true)
      setFetchError(null)
      const [usersData, jobFunctionsData] = await Promise.all([
        usersApi.list(),
        usersApi.listJobFunctions(),
      ])
      setUsers(usersData)
      setJobFunctions(jobFunctionsData)
    } catch (err: any) {
      console.error('Erro ao carregar dados de usuários:', err)
      setFetchError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  const reloadJobFunctions = useCallback(async () => {
    try {
      const data = await usersApi.listJobFunctions()
      setJobFunctions(data)
    } catch (err) {
      console.error('Erro ao carregar funções:', err)
    }
  }, [])

  // ── Handlers de Gerenciar Funções ───────────────────────────────────────────
  const handleOpenJobFunctionModal = () => {
    setJobFunctionActionError(null)
    setNewJobFunctionName('')
    setEditingJobFunctionId(null)
    setJobFunctionModalOpen(true)
  }

  const handleCreateJobFunction = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newJobFunctionName.trim()
    if (!name) return
    setJobFunctionActionError(null)
    try {
      await usersApi.createJobFunction({ name })
      setNewJobFunctionName('')
      await reloadJobFunctions()
    } catch (err: any) {
      setJobFunctionActionError(err?.message ?? 'Erro ao criar função.')
    }
  }

  const handleStartEditJobFunction = (jf: ApiJobFunction) => {
    setEditingJobFunctionId(jf.id)
    setEditingJobFunctionName(jf.name)
    setJobFunctionActionError(null)
  }

  const handleSaveEditJobFunction = async (id: string) => {
    const name = editingJobFunctionName.trim()
    if (!name) return
    setJobFunctionActionLoading(id)
    setJobFunctionActionError(null)
    try {
      await usersApi.updateJobFunction(id, { name })
      setEditingJobFunctionId(null)
      await reloadJobFunctions()
      await loadData()
    } catch (err: any) {
      setJobFunctionActionError(err?.message ?? 'Erro ao renomear função.')
    } finally {
      setJobFunctionActionLoading(null)
    }
  }

  const handleToggleJobFunctionActive = async (jf: ApiJobFunction) => {
    setJobFunctionActionLoading(jf.id)
    setJobFunctionActionError(null)
    try {
      await usersApi.updateJobFunction(jf.id, { isActive: !jf.isActive })
      await reloadJobFunctions()
    } catch (err: any) {
      setJobFunctionActionError(err?.message ?? 'Erro ao atualizar função.')
    } finally {
      setJobFunctionActionLoading(null)
    }
  }

  const handleDeleteJobFunction = async (jf: ApiJobFunction) => {
    if (!confirm(`Excluir a função "${jf.name}"?`)) return
    setJobFunctionActionLoading(jf.id)
    setJobFunctionActionError(null)
    try {
      await usersApi.deleteJobFunction(jf.id)
      await reloadJobFunctions()
    } catch (err: any) {
      setJobFunctionActionError(err?.message ?? 'Erro ao excluir função.')
    } finally {
      setJobFunctionActionLoading(null)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      loadData()
    }
  }, [isAuthorized, loadData])

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        (u.employee?.fullName ?? '').toLowerCase().includes(q) ||
        (u.employee?.registration ?? '').toLowerCase().includes(q)

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  // ── Form Handlers ──────────────────────────────────────────────────────────
  const handleOpenNewForm = () => {
    setEditingUser(null)
    setEmail('')
    setPassword('')
    setRole('COLLABORATOR')
    setIsActive(true)
    setFullName('')
    setPhone('')
    setCpf('')
    setPosition('')
    setIsCustomPosition(false)
    setCustomPosition('')
    setRegistration('')
    setCnhExpirationDate('')
    setFormError(null)
    setFormOpen(true)
  }

  const handleOpenEditForm = (user: ApiUser) => {
    setEditingUser(user)
    setEmail(user.email)
    setPassword('') // Senha vazia significa que não será alterada
    setRole(user.role)
    setIsActive(user.isActive)
    setFullName(user.employee?.fullName ?? '')
    setPhone(user.employee?.phone ?? '')
    setCpf(user.employee?.cpf ? formatCpf(user.employee.cpf) : '')
    const currentPos = user.employee?.position ?? ''
    setPosition(currentPos)
    setIsCustomPosition(false)
    setCustomPosition('')
    setRegistration(user.employee?.registration ?? '')
    setCnhExpirationDate(user.employee?.cnhExpirationDate ? user.employee.cnhExpirationDate.slice(0, 10) : '')
    setFormError(null)
    setFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setFormError('E-mail é obrigatório.')
      return
    }
    if (!editingUser && !password) {
      setFormError('Senha é obrigatória para novos usuários.')
      return
    }
    if (password && password.length < 8) {
      setFormError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!fullName.trim()) {
      setFormError('Nome completo é obrigatório.')
      return
    }
    if (!registration.trim()) {
      setFormError('Número de Matrícula é obrigatório.')
      return
    }
    const normalizedCpf = cpf.replace(/\D/g, '')
    if (!normalizedCpf) {
      setFormError('CPF é obrigatório.')
      return
    }
    if (normalizedCpf.length !== 11) {
      setFormError('CPF deve ter exatamente 11 dígitos.')
      return
    }
    if (!phone.trim()) {
      setFormError('WhatsApp é obrigatório.')
      return
    }
    const finalPosition = isCustomPosition ? customPosition.trim() : position.trim()
    if (!finalPosition) {
      setFormError('Função é obrigatória.')
      return
    }

    setFormError(null)
    setFormSubmitting(true)

    try {
      // Se for uma função nova (digitada livremente), registra na lista gerenciável também
      if (isCustomPosition && !jobFunctions.some((f) => f.name.toLowerCase() === finalPosition.toLowerCase())) {
        try {
          await usersApi.createJobFunction({ name: finalPosition })
        } catch (err) {
          console.error('Não foi possível registrar a nova função na lista gerenciável:', err)
        }
      }

      if (editingUser) {
        // Atualizar
        await usersApi.update(editingUser.id, {
          email: email.trim(),
          role,
          isActive,
          fullName: fullName.trim(),
          phone: phone.trim(),
          cpf: normalizedCpf,
          position: finalPosition,
          registration: registration.trim(),
          cnhExpirationDate: cnhExpirationDate || null,
          ...(password ? { password } : {}),
        })
      } else {
        // Criar
        await usersApi.create({
          email: email.trim(),
          password,
          role,
          isActive,
          fullName: fullName.trim(),
          phone: phone.trim(),
          cpf: normalizedCpf,
          position: finalPosition,
          registration: registration.trim(),
          cnhExpirationDate: cnhExpirationDate || null,
        })
      }
      setFormOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err)
      setFormError(err?.message ?? 'Falha ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // ── Delete Handlers ────────────────────────────────────────────────────────
  const handleOpenDelete = (user: ApiUser) => {
    if (user.id === currentUser?.id) {
      alert('Você não pode excluir a sua própria conta ativa.')
      return
    }
    setDeletingUser(user)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return
    setDeleteError(null)
    setDeleteSubmitting(true)

    try {
      await usersApi.delete(deletingUser.id)
      setDeleteOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao deletar usuário:', err)
      setDeleteError(err?.message ?? 'Falha ao deletar usuário. Tente novamente.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Render: Acesso Restrito ───────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto py-12 px-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card text-center p-8 animate-scale-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6">
            Desculpe, a área de administração de usuários é reservada para administradores e gestores do sistema.
          </p>
          <Button onClick={() => navigate('/')} className="w-full font-semibold">
            Voltar para o Início
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loadingData ? 'Buscando contas de acesso...' : `Administre as ${users.length} contas de acesso cadastradas`}
          </p>
        </div>
        <Button size="md" className="flex-shrink-0" onClick={handleOpenNewForm}>
          <Plus size={16} />
          Novo Usuário
        </Button>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center text-center gap-3">
          <AlertCircle size={28} className="text-red-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Erro de Comunicação</p>
            <p className="text-xs text-gray-500 mt-0.5">{fetchError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {loadingData && !fetchError ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-card animate-pulse">
          <Loader2 size={36} className="text-brand-primary animate-spin mb-3" />
          <p className="text-gray-500 text-sm font-medium">Buscando contas de acesso do servidor...</p>
        </div>
      ) : (
        !fetchError && (
          <>
            {/* ── Controles de Filtros e Busca ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Buscar por e-mail ou colaborador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 md:w-44 md:flex-none">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                    className="w-full h-11 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  >
                    <option value="ALL">Todos os Perfis</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MANAGER_WORKSITE">Gestor de Obra</option>
                    <option value="MANAGER_HR">Gestor de RH</option>
                    <option value="MANAGER_WAREHOUSE">Gestor de Almoxarifado</option>
                    <option value="COLLABORATOR">Colaborador</option>
                  </select>
                </div>

                <div className="flex-1 md:w-40 md:flex-none">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full h-11 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Grid/Lista de Contas ── */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-card">
                <Users size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">Nenhum usuário encontrado</p>
                <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros de busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const roleVariant = ROLE_BADGE_VARIANTS[u.role] ?? 'default'
                  const isCurrent = u.id === currentUser?.id

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        'bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col justify-between hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150',
                        isCurrent && 'ring-2 ring-brand-primary/20 border-brand-primary/25 bg-slate-50/50',
                      )}
                    >
                      <div className="space-y-3.5">
                        {/* Header card */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate leading-snug">{u.email}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Criado em: {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant={roleVariant}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </div>

                        {/* Detalhes do colaborador */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Dados do Colaborador</p>
                          {u.employee ? (
                            <>
                              <p className="text-xs font-bold text-gray-800 truncate">{u.employee.fullName}</p>
                              <p className="text-[10px] text-gray-500">
                                {u.employee.position} · {u.employee.registration} {u.employee.cpf ? `· CPF: ${formatCpf(u.employee.cpf)}` : ''}
                              </p>
                              {u.employee.cnhExpirationDate && (
                                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <span>Validade CNH:</span>
                                  <span className={cn(
                                    "font-semibold",
                                    new Date(u.employee.cnhExpirationDate) < new Date() ? "text-red-500" : "text-gray-700"
                                  )}>
                                    {new Date(u.employee.cnhExpirationDate).toLocaleDateString('pt-BR')}
                                    {new Date(u.employee.cnhExpirationDate) < new Date() && " (Vencida)"}
                                  </span>
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Sem dados de colaborador</p>
                          )}
                        </div>
                      </div>

                      {/* Footer / Ações */}
                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          {u.isActive ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <UserCheck size={13} />
                              Ativo
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                              <UserX size={13} />
                              Inativo
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md">
                              Você
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors"
                            title="Editar Usuário"
                          >
                            <Edit2 size={15} />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleOpenDelete(u)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      )}

      {/* ── MODAL: NOVO / EDITAR USUÁRIO ── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        description={editingUser ? `Edite a conta ${editingUser.email}` : 'Crie uma nova conta de acesso.'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600 animate-fade-in">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <p className="font-semibold leading-relaxed">{formError}</p>
            </div>
          )}

          <div>
            <Label htmlFor="email" required>
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Ex: joao@3tengenharia.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" required={!editingUser}>
              Senha {editingUser && <span className="text-[10px] text-gray-400 font-normal">(deixe em branco para não alterar)</span>}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11"
                required={!editingUser}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fullName" required>
                Nome Completo
              </Label>
              <Input
                id="fullName"
                placeholder="Ex: João da Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>

            <div>
              <Label htmlFor="registration" required>
                Número da Matrícula
              </Label>
              <Input
                id="registration"
                placeholder="Ex: MAT-123456"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpf" required>
                CPF
              </Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                className="mt-1.5 h-11"
                maxLength={14}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone" required>
                WhatsApp
              </Label>
              <Input
                id="phone"
                placeholder="Ex: (11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="role" required>
                Perfil de Acesso
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                required
              >
                <option value="COLLABORATOR">Colaborador</option>
                <option value="MANAGER_WORKSITE">Gestor de Obra</option>
                <option value="MANAGER_HR">Gestor de RH</option>
                <option value="MANAGER_WAREHOUSE">Gestor de Almoxarifado</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div>
              <Label htmlFor="cnhExpirationDate">
                Validade da CNH
              </Label>
              <Input
                id="cnhExpirationDate"
                type="date"
                value={cnhExpirationDate}
                onChange={(e) => setCnhExpirationDate(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="position" required>
                  Função
                </Label>
                <button
                  type="button"
                  onClick={handleOpenJobFunctionModal}
                  className="text-[11px] font-semibold text-brand-primary hover:underline mb-1.5"
                >
                  Gerenciar funções
                </button>
              </div>
              <select
                id="position"
                value={isCustomPosition ? 'CUSTOM' : position}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'CUSTOM') {
                    setIsCustomPosition(true)
                  } else {
                    setIsCustomPosition(false)
                    setPosition(val)
                  }
                }}
                className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                required
              >
                <option value="">Selecione uma função...</option>
                {activeJobFunctions.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
                <option value="CUSTOM">+ Adicionar nova função...</option>
              </select>
            </div>

            {isCustomPosition ? (
              <div className="animate-slide-down">
                <Label htmlFor="customPosition" required>
                  Nome da Nova Função
                </Label>
                <Input
                  id="customPosition"
                  placeholder="Ex: Encarregado de Obras"
                  value={customPosition}
                  onChange={(e) => setCustomPosition(e.target.value)}
                  className="mt-1.5 h-11"
                  required
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary/25 cursor-pointer"
            />
            <Label htmlFor="isActive" className="cursor-pointer font-semibold text-gray-700">
              Conta de acesso ativa (permite login)
            </Label>
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full font-bold shadow-lg shadow-brand-accent/20 mt-4"
            disabled={formSubmitting || !email}
          >
            {formSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando conta...
              </>
            ) : (
              <>
                {editingUser ? 'Atualizar Usuário' : 'Criar Conta de Acesso'}
              </>
            )}
          </Button>
        </form>
      </Dialog>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO ── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmar Exclusão"
        description="Esta ação removerá a conta de acesso permanentemente."
      >
        <div className="space-y-4 pt-2">
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              <p className="font-semibold leading-relaxed">{deleteError}</p>
            </div>
          )}

          {deletingUser && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm space-y-1">
              <p className="text-gray-500 font-medium">Você tem certeza que deseja excluir o usuário?</p>
              <p className="font-bold text-gray-900 mt-1">{deletingUser.email}</p>
              {deletingUser.employee && (
                <p className="text-xs text-gray-400">Nome: {deletingUser.employee.fullName}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="flex-1 font-semibold"
              disabled={deleteSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              className="flex-1 font-bold shadow-lg shadow-red-200"
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Conta'
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── MODAL: GERENCIAR FUNÇÕES ── */}
      <Dialog
        open={jobFunctionModalOpen}
        onClose={() => setJobFunctionModalOpen(false)}
        title="Gerenciar Funções"
        description="Edite ou exclua funções cadastradas. Só é possível excluir funções sem funcionário vinculado."
      >
        <div className="space-y-4 pt-2">
          {jobFunctionActionError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold">{jobFunctionActionError}</p>
            </div>
          )}

          <form onSubmit={handleCreateJobFunction} className="flex gap-2">
            <Input
              placeholder="Nova função..."
              value={newJobFunctionName}
              onChange={(e) => setNewJobFunctionName(e.target.value)}
              className="flex-1 h-10"
            />
            <Button type="submit" size="sm" className="h-10 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {jobFunctions.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">Nenhuma função cadastrada.</p>
            ) : (
              jobFunctions.map((jf) => (
                <div key={jf.id} className="p-3 flex items-center gap-2">
                  {editingJobFunctionId === jf.id ? (
                    <>
                      <Input
                        value={editingJobFunctionName}
                        onChange={(e) => setEditingJobFunctionName(e.target.value)}
                        className="flex-1 h-9 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-9 shrink-0"
                        onClick={() => handleSaveEditJobFunction(jf.id)}
                        disabled={jobFunctionActionLoading === jf.id}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 shrink-0"
                        onClick={() => setEditingJobFunctionId(null)}
                        disabled={jobFunctionActionLoading === jf.id}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', !jf.isActive && 'text-gray-400 line-through')}>
                          {jf.name}
                        </p>
                        {!jf.isActive && <p className="text-[10px] text-gray-400">Inativa</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleJobFunctionActive(jf)}
                        disabled={jobFunctionActionLoading === jf.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
                        title={jf.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {jf.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditJobFunction(jf)}
                        disabled={jobFunctionActionLoading === jf.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-primary transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJobFunction(jf)}
                        disabled={jobFunctionActionLoading === jf.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {jobFunctionActionLoading === jf.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
