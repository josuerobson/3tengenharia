import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Check,
  Building2,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { timeLogsApi, type ApiAllocationWorksite, type ApiAllocationManager, type ApiAllocationEmployee } from '@/lib/api'

export default function TeamAllocationPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isAuthorized = currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')

  // ── States ──
  const [worksites, setWorksites] = useState<ApiAllocationWorksite[]>([])
  const [managers, setManagers] = useState<ApiAllocationManager[]>([])
  const [employees, setEmployees] = useState<ApiAllocationEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Load Data ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const data = await timeLogsApi.getTeamAllocationData()
      setWorksites(data.worksites)
      setManagers(data.managers)
      setEmployees(data.employees)
    } catch (err: any) {
      console.error('Erro ao carregar dados de alocação:', err)
      setFetchError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      loadData()
    }
  }, [isAuthorized, loadData])

  // Sync checkboxes when worksite/manager changes
  useEffect(() => {
    if (selectedWorksiteId && selectedManagerId) {
      const initialChecked = employees
        .filter(emp => emp.worksiteId === selectedWorksiteId && emp.managerId === selectedManagerId)
        .map(emp => emp.id)
      setSelectedEmployeeIds(initialChecked)
    } else {
      setSelectedEmployeeIds([])
    }
    setSubmitSuccess(false)
    setSubmitError(null)
  }, [selectedWorksiteId, selectedManagerId, employees])

  // ── Segregar Colaboradores ──
  const { allocatedHere, available, elsewhere } = useMemo(() => {
    if (!selectedWorksiteId || !selectedManagerId) {
      return { allocatedHere: [], available: [], elsewhere: [] }
    }

    const alloc: ApiAllocationEmployee[] = []
    const avail: ApiAllocationEmployee[] = []
    const els: ApiAllocationEmployee[] = []

    employees.forEach(emp => {
      if (emp.worksiteId === selectedWorksiteId && emp.managerId === selectedManagerId) {
        alloc.push(emp)
      } else if (!emp.worksiteId && !emp.managerId) {
        avail.push(emp)
      } else {
        els.push(emp)
      }
    })

    return { allocatedHere: alloc, available: avail, elsewhere: els }
  }, [selectedWorksiteId, selectedManagerId, employees])

  // ── Filtragem de Pesquisa ──
  const filterFn = (emp: ApiAllocationEmployee) => {
    const term = searchTerm.toLowerCase()
    return (
      emp.fullName.toLowerCase().includes(term) ||
      emp.registration.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term)
    )
  }

  const filteredAllocatedHere = useMemo(() => allocatedHere.filter(filterFn), [allocatedHere, searchTerm])
  const filteredAvailable = useMemo(() => available.filter(filterFn), [available, searchTerm])
  const filteredElsewhere = useMemo(() => elsewhere.filter(filterFn), [elsewhere, searchTerm])

  const handleToggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setSubmitSuccess(false)
  }

  const handleSave = async () => {
    if (!selectedWorksiteId || !selectedManagerId) return

    try {
      setSubmitting(true)
      setSubmitError(null)
      setSubmitSuccess(false)

      await timeLogsApi.saveTeamAllocation({
        worksiteId: selectedWorksiteId,
        managerId: selectedManagerId,
        employeeIds: selectedEmployeeIds,
      })

      setSubmitSuccess(true)
      // Recarrega os dados do backend para atualizar o estado local dos colaboradores
      const data = await timeLogsApi.getTeamAllocationData()
      setEmployees(data.employees)
    } catch (err: any) {
      console.error('Erro ao salvar alocação de equipe:', err)
      setSubmitError(err?.message ?? 'Ocorreu um erro ao salvar a alocação.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render: Acesso Restrito ──
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto py-12 px-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card text-center p-8 animate-scale-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6">
            Desculpe, a área de alocação de equipes é reservada para administradores e gestores do sistema.
          </p>
          <Button onClick={() => navigate('/')} className="w-full font-semibold">
            Voltar para o Início
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: Loading Geral ──
  if (loading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm text-gray-500 font-medium">Carregando dados de alocação...</p>
      </div>
    )
  }

  // ── Render: Erro Geral ──
  if (fetchError) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Erro ao Carregar</h3>
        <p className="text-sm text-gray-500 mb-6">{fetchError}</p>
        <Button onClick={loadData} className="w-full">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5 font-medium">
          <span>Rateio de Horas</span>
          <span>/</span>
          <span className="text-brand-primary">Alocar equipes</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Users className="text-brand-primary" size={24} />
          Alocação de Equipes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione a obra e o gestor para alocar os colaboradores e gerenciar a composição das equipes de campo.
        </p>
      </div>

      {/* Seletores de Obra e Gestor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            <Building2 size={14} className="text-brand-primary" />
            Obra de Destino
          </label>
          <select
            value={selectedWorksiteId}
            onChange={(e) => setSelectedWorksiteId(e.target.value)}
            className="w-full h-11 px-3.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-primary font-medium text-gray-800 transition-colors"
          >
            <option value="">Selecione uma obra ativa...</option>
            {worksites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            <Users size={14} className="text-brand-primary" />
            Gestor Responsável
          </label>
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="w-full h-11 px-3.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-primary font-medium text-gray-800 transition-colors"
          >
            <option value="">Selecione um gestor de obra...</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.employee?.fullName ?? m.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {!selectedWorksiteId || !selectedManagerId ? (
        <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 py-16 text-center text-gray-400 space-y-3">
          <ArrowLeftRight className="mx-auto text-gray-300" size={36} />
          <p className="text-sm font-medium">
            Selecione uma obra e um gestor acima para visualizar e gerenciar a equipe.
          </p>
        </div>
      ) : (
        <div className="space-y-5 animate-scale-in">
          {/* Barra de Busca e Sucesso */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-primary bg-white shadow-sm"
              />
            </div>

            {submitSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold py-2 px-4 rounded-xl flex items-center gap-2">
                <Check size={16} className="text-emerald-500" />
                Alocação gravada com sucesso!
              </div>
            )}

            {submitError && (
              <div className="bg-red-50 border border-red-100 text-red-800 text-sm font-semibold py-2 px-4 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                {submitError}
              </div>
            )}
          </div>

          {/* Listas de Colaboradores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Já Alocados */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                  Alocados nesta Equipe
                </h3>
                <span className="bg-brand-primary/10 text-brand-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedEmployeeIds.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredAllocatedHere.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Nenhum colaborador alocado atualmente nesta combinação.
                  </p>
                )}
                {filteredAllocatedHere.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    checked={selectedEmployeeIds.includes(emp.id)}
                    onToggle={() => handleToggleEmployee(emp.id)}
                    badgeText="Esta Equipe"
                    badgeColor="bg-brand-primary/10 text-brand-primary"
                  />
                ))}
              </div>
            </div>

            {/* Coluna 2: Disponíveis */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Disponíveis (Sem Equipe)
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredAvailable.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredAvailable.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Nenhum colaborador ativo sem equipe encontrado.
                  </p>
                )}
                {filteredAvailable.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    checked={selectedEmployeeIds.includes(emp.id)}
                    onToggle={() => handleToggleEmployee(emp.id)}
                    badgeText="Disponível"
                    badgeColor="bg-emerald-50 text-emerald-700"
                  />
                ))}
              </div>
            </div>

            {/* Coluna 3: Alocados em outras equipes */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Em Outras Obras/Gestores
                </h3>
                <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredElsewhere.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredElsewhere.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Nenhum colaborador alocado em outras equipes encontrado.
                  </p>
                )}
                {filteredElsewhere.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    checked={selectedEmployeeIds.includes(emp.id)}
                    onToggle={() => handleToggleEmployee(emp.id)}
                    badgeText={`${emp.worksite?.name || 'Obra'} - ${emp.manager?.employee?.fullName || emp.manager?.email || 'Gestor'}`}
                    badgeColor="bg-amber-50 text-amber-700"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedWorksiteId('')
                setSelectedManagerId('')
              }}
              disabled={submitting}
              className="font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="font-semibold min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Alocação'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface EmployeeRowProps {
  employee: ApiAllocationEmployee
  checked: boolean
  onToggle: () => void
  badgeText: string
  badgeColor: string
}

function EmployeeRow({ employee, checked, onToggle, badgeText, badgeColor }: EmployeeRowProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex items-start gap-3 p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none',
        checked
          ? 'bg-brand-primary/5 border-brand-primary/30 shadow-sm'
          : 'bg-white border-gray-100 hover:border-gray-200'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <div
          className={cn(
            'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
            checked
              ? 'bg-brand-primary border-brand-primary text-white'
              : 'border-gray-300 bg-white'
          )}
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </div>
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-bold truncate leading-tight', checked ? 'text-brand-primary' : 'text-gray-900')}>
            {employee.fullName}
          </p>
        </div>
        <p className="text-xs text-gray-500 font-medium">
          {employee.position} • Matrícula: {employee.registration}
        </p>
        <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 max-w-full truncate', badgeColor)}>
          {badgeText}
        </span>
      </div>
    </div>
  )
}
