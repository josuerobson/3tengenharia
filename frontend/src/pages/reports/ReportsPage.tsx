// src/pages/reports/ReportsPage.tsx
// Hub de Relatórios — Nível 1 do menu (Sidebar) leva aqui. Nível 2 são as abas
// (módulos), Nível 3 é a grade de cards com os relatórios de cada módulo.

import { useState } from 'react'
import { FileBarChart2, Car, Wrench, Clock, ClipboardCheck, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import VehicleUtilizationReport from './VehicleUtilizationReport'
import VehicleMaintenanceReport from './VehicleMaintenanceReport'
import VehicleMileageHistoryReport from './VehicleMileageHistoryReport'
import AssetLoansReport from './AssetLoansReport'
import AssetUsageHistoryReport from './AssetUsageHistoryReport'
import AssetInventoryReport from './AssetInventoryReport'
import AssetMaintenanceReport from './AssetMaintenanceReport'
import WorkedHoursReport from './WorkedHoursReport'
import TimelogsMonthlySummaryReport from './TimelogsMonthlySummaryReport'
import FiveSAuditReport from './FiveSAuditReport'
import FiveSNonConformitiesReport from './FiveSNonConformitiesReport'
import FiveSEvolutionReport from './FiveSEvolutionReport'

type ModuleKey = 'vehicles' | 'assets' | 'timelogs' | 'fiveS'
type ReportKey =
  | 'vehicle-utilization'
  | 'vehicle-maintenance'
  | 'vehicle-mileage-history'
  | 'asset-loans'
  | 'asset-usage-history'
  | 'asset-inventory'
  | 'asset-maintenance'
  | 'worked-hours'
  | 'timelogs-monthly-summary'
  | 'fiveS-audits'
  | 'fiveS-nonconformities'
  | 'fiveS-evolution'

interface ReportDefinition {
  key: ReportKey
  label: string
}

interface ModuleDefinition {
  key: ModuleKey
  label: string
  icon: React.ElementType
  pageKey: string
  reports: ReportDefinition[]
}

const MODULES: ModuleDefinition[] = [
  {
    key: 'vehicles',
    label: 'Controle de Veículos',
    icon: Car,
    pageKey: 'reports.vehicles',
    reports: [
      { key: 'vehicle-utilization', label: 'Utilização de Veículos por Período' },
      { key: 'vehicle-maintenance', label: 'Manutenções Preventivas e Realizadas' },
      { key: 'vehicle-mileage-history', label: 'Histórico de Quilometragem por Veículo' },
    ],
  },
  {
    key: 'assets',
    label: 'Ferramentas e Equipamentos',
    icon: Wrench,
    pageKey: 'reports.assets',
    reports: [
      { key: 'asset-loans', label: 'Empréstimos Ativos e Pendentes' },
      { key: 'asset-usage-history', label: 'Histórico de Uso por Ferramenta' },
      { key: 'asset-inventory', label: 'Inventário de Ferramentas e Equipamentos' },
      { key: 'asset-maintenance', label: 'Manutenções de Ferramentas' },
    ],
  },
  {
    key: 'timelogs',
    label: 'Rateio de Horas',
    icon: Clock,
    pageKey: 'reports.timelogs',
    reports: [
      { key: 'worked-hours', label: 'Horas Trabalhadas' },
      { key: 'timelogs-monthly-summary', label: 'Resumo Mensal de Rateio de Horas' },
    ],
  },
  {
    key: 'fiveS',
    label: '5S',
    icon: ClipboardCheck,
    pageKey: 'reports.fiveS',
    reports: [
      { key: 'fiveS-audits', label: 'Auditoria 5S por Área' },
      { key: 'fiveS-nonconformities', label: 'Não Conformidades 5S — Pendentes e Resolvidas' },
      { key: 'fiveS-evolution', label: 'Evolução 5S por Período' },
    ],
  },
]

const REPORT_COMPONENTS: Record<ReportKey, React.ComponentType<{ onBack: () => void }>> = {
  'vehicle-utilization': VehicleUtilizationReport,
  'vehicle-maintenance': VehicleMaintenanceReport,
  'vehicle-mileage-history': VehicleMileageHistoryReport,
  'asset-loans': AssetLoansReport,
  'asset-usage-history': AssetUsageHistoryReport,
  'asset-inventory': AssetInventoryReport,
  'asset-maintenance': AssetMaintenanceReport,
  'worked-hours': WorkedHoursReport,
  'timelogs-monthly-summary': TimelogsMonthlySummaryReport,
  'fiveS-audits': FiveSAuditReport,
  'fiveS-nonconformities': FiveSNonConformitiesReport,
  'fiveS-evolution': FiveSEvolutionReport,
}

export default function ReportsPage() {
  const { canReadPage } = useAuth()
  const visibleModules = MODULES.filter((m) => canReadPage(m.pageKey))
  const [activeModule, setActiveModule] = useState<ModuleKey>(visibleModules[0]?.key ?? 'vehicles')
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null)

  if (activeReport) {
    const ReportComponent = REPORT_COMPONENTS[activeReport]
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ReportComponent onBack={() => setActiveReport(null)} />
      </div>
    )
  }

  const currentModule = visibleModules.find((m) => m.key === activeModule) ?? visibleModules[0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <FileBarChart2 className="text-brand-primary w-7 h-7" />
          Relatórios
        </h1>
        <p className="text-sm text-gray-500">
          Relatórios gerenciais por módulo, com exportação em PDF e Excel.
        </p>
      </div>

      {visibleModules.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-400">
          Seu perfil de acesso não tem permissão para nenhum módulo de Relatórios.
        </Card>
      ) : (
        <>
          <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
            {visibleModules.map((mod) => (
              <button
                key={mod.key}
                onClick={() => setActiveModule(mod.key)}
                className={cn(
                  'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors shrink-0 flex items-center gap-2',
                  currentModule?.key === mod.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-600',
                )}
              >
                <mod.icon className="w-4 h-4" />
                {mod.label}
              </button>
            ))}
          </div>

          {currentModule && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentModule.reports.map((report) => (
                <Card
                  key={report.key}
                  onClick={() => setActiveReport(report.key)}
                  className="p-4 flex flex-col gap-3 transition-colors cursor-pointer hover:border-brand-primary/40"
                >
                  <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary w-fit">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{report.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Filtrar, visualizar e exportar</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
