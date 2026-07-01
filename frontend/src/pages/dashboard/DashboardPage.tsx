import { useState, useEffect } from 'react'
import {
  Users,
  Building,
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ClipboardList
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardApi, type DashboardSummary } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dashboardApi.getSummary()
      setSummary(data)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Falha ao buscar indicadores do painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary mb-4" />
        <p className="text-gray-500 text-sm font-medium">Carregando painel de indicadores operacionais...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-card max-w-xl mx-auto my-12 p-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Falha ao carregar indicadores</h3>
        <p className="text-gray-500 text-sm mt-2 mb-6">{error ?? 'Não foi possível buscar os dados do servidor.'}</p>
        <button
          onClick={fetchSummary}
          className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary/95 transition-colors shadow-sm"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="text-brand-primary w-8 h-8" />
          Painel de Controle Operacional
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Visão geral consolidada dos indicadores operacionais da 3T Engenharia.
        </p>
      </div>

      {/* 1. KPIs Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colaboradores Ativos</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.general.activeUsers}</h2>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Obras em Andamento</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.general.activeWorksites}</h2>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Empréstimos Ativos</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.warehouse.activeLoans}</h2>
          </div>
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conformidade 5S</p>
            <h2 className="text-3xl font-black text-emerald-600">{summary.fiveS.conformityRate5S}%</h2>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* 2. Módulos Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* MÓDULO 1: VEÍCULOS */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Controle de Frota</h3>
                  <p className="text-xs text-gray-400">Status de veículos e viagens</p>
                </div>
              </div>
              <Badge variant="default" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0">Módulo 1</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Frota Total</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{summary.vehicles.totalVehicles}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-3 text-center border border-emerald-100/50">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase">Disponíveis</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{summary.vehicles.availableVehicles}</p>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-3 text-center border border-blue-100/50">
                <p className="text-[10px] text-blue-600 font-semibold uppercase">Em Trânsito</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{summary.vehicles.activeTrips}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertas de Manutenção Preventiva
                </span>
                <span className={cn("font-bold text-sm", summary.vehicles.vehiclesWithAlert > 0 ? "text-amber-600" : "text-gray-500")}>
                  {summary.vehicles.vehiclesWithAlert} {summary.vehicles.vehiclesWithAlert === 1 ? 'veículo' : 'veículos'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-2.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-red-500" />
                  Veículos em Oficina / Manutenção
                </span>
                <span className="font-semibold text-gray-700">{summary.vehicles.maintenanceVehicles}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2">
            <Link
              to="/vehicles/trips"
              className="flex-1 text-center py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200"
            >
              Histórico de Viagens
            </Link>
            <Link
              to="/vehicles/trips/new"
              className="flex-1 text-center py-2 bg-brand-primary text-white hover:bg-brand-primary/95 font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
            >
              Iniciar Viagem
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* MÓDULO 2: ALMOXARIFADO */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Almoxarifado</h3>
                  <p className="text-xs text-gray-400">Ferramentas, EPIs e Equipamentos</p>
                </div>
              </div>
              <Badge variant="default" className="bg-violet-50 text-violet-700 hover:bg-violet-50 border-0">Módulo 2</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Itens</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{summary.warehouse.totalAssets}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-3 text-center border border-emerald-100/50">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase">Disponíveis</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{summary.warehouse.availableAssets}</p>
              </div>
              <div className="bg-violet-50/50 rounded-xl p-3 text-center border border-violet-100/50">
                <p className="text-[10px] text-violet-600 font-semibold uppercase">Emprestados</p>
                <p className="text-xl font-bold text-violet-700 mt-1">{summary.warehouse.loanedAssets}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Chamados de Avaria / Defeito Abertos
                </span>
                <span className={cn("font-bold text-sm", summary.warehouse.openAssetMaintenances > 0 ? "text-red-600" : "text-gray-500")}>
                  {summary.warehouse.openAssetMaintenances} chamados
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-2.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Itens em Manutenção
                </span>
                <span className="font-semibold text-gray-700">{summary.warehouse.maintenanceAssets}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2">
            <Link
              to="/assets/catalog"
              className="flex-1 text-center py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200"
            >
              Catálogo de Bens
            </Link>
            <Link
              to="/assets/warehouse"
              className="flex-1 text-center py-2 bg-brand-primary text-white hover:bg-brand-primary/95 font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
            >
              Gerenciar Estoque
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* MÓDULO 3: DIÁRIO DE CLASSE / HORAS */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Diário de Classe / Horas</h3>
                  <p className="text-xs text-gray-400">Apuração de horas e ponto da equipe</p>
                </div>
              </div>
              <Badge variant="default" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Módulo 3</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase">Lançamentos Pendentes</p>
                <p className={cn("text-2xl font-black mt-1.5", summary.timeLogs.pendingTimeLogs > 0 ? "text-amber-600 animate-pulse" : "text-gray-800")}>
                  {summary.timeLogs.pendingTimeLogs}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase">Horas Computadas (Últimos 7 dias)</p>
                <p className="text-2xl font-black text-gray-800 mt-1.5">{summary.timeLogs.totalHoursLast7Days}h</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600 leading-normal">
              <CheckCircle2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <p>
                Lançamentos pendentes representam inconsistências ou registros aguardando validação final de gestores para cálculo financeiro.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2">
            <Link
              to="/time-logs/daily"
              className="flex-1 text-center py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200"
            >
              Apontar Dia
            </Link>
            <Link
              to="/time-logs/report"
              className="flex-1 text-center py-2 bg-brand-primary text-white hover:bg-brand-primary/95 font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
            >
              Relatório por C.C.
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* MÓDULO 4: PROGRAMA 5S / QUALIDADE */}
        <Card className="p-6 border border-gray-100 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Gestão de Qualidade 5S</h3>
                  <p className="text-xs text-gray-400">Auditorias de organização e limpeza</p>
                </div>
              </div>
              <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Módulo 5S</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Auditorias</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{summary.fiveS.totalAudits5S}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-3 text-center border border-emerald-100/50">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase">Conformes</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{summary.fiveS.conformAudits5S}</p>
              </div>
              <div className="bg-red-50/50 rounded-xl p-3 text-center border border-red-100/50">
                <p className="text-[10px] text-red-600 font-semibold uppercase">Não Conformes</p>
                <p className="text-xl font-bold text-red-700 mt-1">
                  {Math.max(0, summary.fiveS.totalAudits5S - summary.fiveS.conformAudits5S)}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Auditorias Pendentes de Avaliação
                </span>
                <span className={cn("font-bold text-sm", summary.fiveS.pendingAudits5S > 0 ? "text-emerald-600 animate-pulse" : "text-gray-500")}>
                  {summary.fiveS.pendingAudits5S} registros
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-2.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Taxa de Organização / Conformidade
                </span>
                <span className="font-black text-emerald-600 text-sm">{summary.fiveS.conformityRate5S}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2">
            <Link
              to="/5s/audit/new"
              className="flex-1 text-center py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200"
            >
              Nova Auditoria
            </Link>
            <Link
              to="/5s/panel"
              className="flex-1 text-center py-2 bg-brand-primary text-white hover:bg-brand-primary/95 font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
            >
              Painel da Qualidade
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

      </div>
    </div>
  )
}
