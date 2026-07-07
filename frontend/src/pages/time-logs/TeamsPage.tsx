import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Building2,
  User,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  X,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  UserMinus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { timeLogsApi, type ApiAllocationWorksite, type ApiAllocationManager, type ApiAllocationEmployee } from '@/lib/api'

// Função para gerar cores pastéis consistentes para os avatares baseados no nome do colaborador
function getAvatarColorClass(name: string) {
  const colors = [
    'bg-blue-50 text-blue-600 border-blue-100',
    'bg-emerald-50 text-emerald-600 border-emerald-100',
    'bg-indigo-50 text-indigo-600 border-indigo-100',
    'bg-violet-50 text-violet-600 border-violet-100',
    'bg-amber-50 text-amber-600 border-amber-100',
    'bg-sky-50 text-sky-600 border-sky-100',
    'bg-rose-50 text-rose-600 border-rose-100',
  ]
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return colors[sum % colors.length]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Limpa e formata o link para o WhatsApp
function formatWhatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const withDdi = digits.length <= 11 && !digits.startsWith('55') ? `55${digits}` : digits
  return `https://wa.me/${withDdi}`
}

export default function TeamsPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  // ── States ──
  const [worksites, setWorksites] = useState<ApiAllocationWorksite[]>([])
  const [managers, setManagers] = useState<ApiAllocationManager[]>([])
  const [employees, setEmployees] = useState<ApiAllocationEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Filter States ──
  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

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
      console.error('Erro ao carregar equipes:', err)
      setFetchError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Limpar Filtros ──
  const handleClearFilters = () => {
    setSelectedWorksiteId('')
    setSelectedManagerId('')
    setSearchTerm('')
  }

  const isFiltered = selectedWorksiteId !== '' || selectedManagerId !== '' || searchTerm !== ''

  // ── Filtragem dos Colaboradores ──
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filtro por Obra
      if (selectedWorksiteId && emp.worksiteId !== selectedWorksiteId) {
        return false
      }
      // Filtro por Gestor
      if (selectedManagerId && emp.managerId !== selectedManagerId) {
        return false
      }
      // Filtro de Busca Textual
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchName = emp.fullName.toLowerCase().includes(term)
        const matchPosition = emp.position.toLowerCase().includes(term)
        const matchReg = emp.registration.toLowerCase().includes(term)
        const matchWorksite = emp.worksite?.name.toLowerCase().includes(term)
        const matchManager = emp.manager?.employee?.fullName.toLowerCase().includes(term)

        if (!matchName && !matchPosition && !matchReg && !matchWorksite && !matchManager) {
          return false
        }
      }
      return true
    })
  }, [employees, selectedWorksiteId, selectedManagerId, searchTerm])

  // ── Agrupamento em Equipes ──
  const { teams, unallocated } = useMemo(() => {
    const teamsMap = new Map<string, {
      worksite: ApiAllocationWorksite | null
      manager: ApiAllocationManager | null
      employees: ApiAllocationEmployee[]
    }>()

    const unallocatedList: ApiAllocationEmployee[] = []

    filteredEmployees.forEach(emp => {
      if (!emp.worksiteId && !emp.managerId) {
        unallocatedList.push(emp)
      } else {
        const key = `${emp.worksiteId || 'none'}-${emp.managerId || 'none'}`
        if (!teamsMap.has(key)) {
          const ws = worksites.find(w => w.id === emp.worksiteId) || 
            (emp.worksite ? { id: emp.worksite.id, name: emp.worksite.name, code: 'N/A' } : null)
          const mgr = managers.find(m => m.id === emp.managerId) || 
            (emp.manager ? { id: emp.manager.id, email: emp.manager.email, employee: emp.manager.employee } : null)
          
          teamsMap.set(key, {
            worksite: ws,
            manager: mgr,
            employees: []
          })
        }
        teamsMap.get(key)!.employees.push(emp)
      }
    })

    // Converte para array e ordena: primeiro por nome da obra, depois por nome do gestor
    const sortedTeams = Array.from(teamsMap.values()).sort((a, b) => {
      const nameA = a.worksite?.name || ''
      const nameB = b.worksite?.name || ''
      return nameA.localeCompare(nameB)
    })

    return { teams: sortedTeams, unallocated: unallocatedList }
  }, [filteredEmployees, worksites, managers])

  return (
    <div className="space-y-6">
      
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-primary to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-primary/10">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Equipes de Campo</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Consulte a distribuição de colaboradores ativos alocados em cada obra e sob a liderança de cada gestor.
            </p>
          </div>
        </div>

        {/* Atalho para edição para quem tem privilégio */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')) && (
          <Button
            onClick={() => navigate('/time-logs/team-allocation')}
            className="bg-brand-primary hover:bg-brand-primary/95 text-white font-medium gap-2 rounded-xl transition-all duration-150"
          >
            Alocar Equipes
            <ChevronRight size={16} />
          </Button>
        )}
      </div>

      {/* ── Seção de Filtros ── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <SlidersHorizontal size={16} className="text-brand-primary" />
          Filtros de Busca
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Busca Textual */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar colaborador ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                       focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                       transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Selecionar Obra */}
          <div>
            <select
              value={selectedWorksiteId}
              onChange={(e) => setSelectedWorksiteId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                       focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                       transition-all"
            >
              <option value="">Todas as Obras / CC</option>
              {worksites.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.code} - {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selecionar Gestor */}
          <div>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                       focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                       transition-all"
            >
              <option value="">Todos os Gestores</option>
              {managers.map(mgr => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.employee?.fullName || mgr.email}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Limpeza */}
          <div className="flex items-center">
            {isFiltered ? (
              <button
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-medium text-gray-500 hover:text-brand-primary bg-gray-50 hover:bg-brand-primary/10 rounded-xl transition-all"
              >
                <X size={16} />
                Limpar Filtros
              </button>
            ) : (
              <div className="text-gray-400 text-xs px-3 py-2 border border-dashed border-gray-200 rounded-xl w-full text-center">
                Preencha para filtrar
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conteúdo Principal ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-brand-primary mb-3" size={32} />
          <p className="text-gray-500 text-sm">Carregando equipes do projeto...</p>
        </div>
      ) : fetchError ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span className="text-sm font-medium">{fetchError}</span>
        </div>
      ) : teams.length === 0 && unallocated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm text-center px-4">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-800">Nenhuma equipe encontrada</h3>
          <p className="text-gray-400 text-sm max-w-sm mt-1">
            Não há colaboradores vinculados a obras ou gestores correspondentes aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grid de Equipes Ativas */}
          {teams.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-base px-1">
                <UserCheck size={18} className="text-emerald-500" />
                <h2>Equipes Estruturadas ({teams.length})</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {teams.map((team, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden border-l-4 border-l-brand-primary"
                  >
                    {/* Header do Card */}
                    <div className="p-4 bg-gradient-to-b from-gray-50/50 to-white border-b border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-[14px] leading-tight">
                              {team.worksite?.name || 'Obra Sem Nome'}
                            </h3>
                            <span className="text-[11px] font-semibold text-brand-primary uppercase tracking-wider">
                              C.C. {team.worksite?.code || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <span className="bg-brand-primary/10 text-brand-primary text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                          {team.employees.length} membro(s)
                        </span>
                      </div>

                      {/* Gestor da Equipe */}
                      <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-dashed border-gray-100 text-xs text-gray-500">
                        <User size={13} className="text-gray-400" />
                        <span className="font-medium text-gray-700">
                          Gestor: {team.manager?.employee?.fullName || team.manager?.email || 'Não Definido'}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Colaboradores */}
                    <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[320px] scrollbar-thin">
                      {team.employees.map((emp) => (
                        <div key={emp.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar com iniciais */}
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border flex-shrink-0',
                              getAvatarColorClass(emp.fullName)
                            )}>
                              {getInitials(emp.fullName)}
                            </div>
                            
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-xs truncate">
                                {emp.fullName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">
                                  Mat. {emp.registration}
                                </span>
                                <span className="text-[10px] text-gray-300">•</span>
                                <span className="text-[10px] text-gray-500 font-medium flex items-center gap-0.5">
                                  <Briefcase size={9} />
                                  {emp.position}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ação rápida para WhatsApp */}
                          {emp.phone ? (
                            <a
                              href={formatWhatsAppLink(emp.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Conversar com ${emp.fullName} no WhatsApp`}
                              className="w-7 h-7 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                            >
                              <Phone size={13} />
                            </a>
                          ) : (
                            <div className="w-7 h-7 bg-gray-50 text-gray-300 border border-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 cursor-not-allowed" title="Sem telefone cadastrado">
                              <Phone size={13} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção de Colaboradores Sem Equipe / Disponíveis */}
          {unallocated.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-base px-1">
                <UserMinus size={18} className="text-amber-500" />
                <h2>Colaboradores Sem Equipe / Disponíveis ({unallocated.length})</h2>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-amber-50/20 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-amber-700 font-medium">
                    Estes colaboradores estão ativos no sistema, mas não estão alocados a nenhuma obra ou sob a liderança de um gestor.
                  </p>
                  {(currentUser?.role === 'ADMIN' || currentUser?.role?.startsWith('MANAGER')) && (
                    <button
                      onClick={() => navigate('/time-logs/team-allocation')}
                      className="text-xs text-brand-primary font-bold hover:underline transition-all duration-150 flex-shrink-0 ml-2"
                    >
                      Alocar agora
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 divide-y sm:divide-y-0 divide-gray-100 sm:gap-px bg-gray-100">
                  {unallocated.map((emp) => (
                    <div key={emp.id} className="p-4 bg-white flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border flex-shrink-0',
                          getAvatarColorClass(emp.fullName)
                        )}>
                          {getInitials(emp.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">
                            {emp.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">
                              Mat. {emp.registration}
                            </span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-500 font-medium flex items-center gap-0.5">
                              <Briefcase size={9} />
                              {emp.position}
                            </span>
                          </div>
                        </div>
                      </div>

                      {emp.phone ? (
                        <a
                          href={formatWhatsAppLink(emp.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Conversar com ${emp.fullName} no WhatsApp`}
                          className="w-7 h-7 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 border border-gray-100 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                        >
                          <Phone size={13} />
                        </a>
                      ) : (
                        <div className="w-7 h-7 bg-gray-50 text-gray-300 border border-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 cursor-not-allowed" title="Sem telefone cadastrado">
                          <Phone size={13} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
