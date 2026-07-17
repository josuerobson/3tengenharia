// src/pages/reports/VehicleMaintenanceReport.tsx
// Relatórios > Controle de Veículos > Manutenções Preventivas e Realizadas

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, vehiclesApi, type VehicleMaintenanceRow, type ApiVehicle } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'veiculo', label: 'Veículo' },
  { key: 'placa', label: 'Placa' },
  { key: 'tipoManutencao', label: 'Tipo de Manutenção' },
  { key: 'kmPrevista', label: 'KM Prevista' },
  { key: 'kmAtual', label: 'KM Atual' },
  { key: 'status', label: 'Status' },
  { key: 'dataUltima', label: 'Última Manutenção' },
  { key: 'dataPrevista', label: 'Próxima Prevista' },
]

const STATUS_BADGE: Record<string, string> = {
  'Em dia': 'bg-emerald-100 text-emerald-700',
  'Requer atenção': 'bg-amber-100 text-amber-700',
  'Crítico': 'bg-red-100 text-red-700',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function VehicleMaintenanceReport({ onBack }: { onBack: () => void }) {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([])
  const [vehicleId, setVehicleId] = useState('')
  const [rows, setRows] = useState<VehicleMaintenanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    vehiclesApi.list().then((r) => setVehicles(r.vehicles)).catch(() => setVehicles([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    reportsApi
      .vehicleMaintenance({ vehicleId: vehicleId || undefined })
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({ ...r, dataUltima: formatDate(r.dataUltima), dataPrevista: formatDate(r.dataPrevista) }))
      if (format === 'pdf') {
        await exportReportToPdf('Manutenções Preventivas e Realizadas', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Manutenções Preventivas e Realizadas', COLUMNS, formatted)
      }
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')} disabled={exporting !== null || rows.length === 0}>
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport('excel')} disabled={exporting !== null || rows.length === 0}>
            {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />}
            Excel
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900">Manutenções Preventivas e Realizadas</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Veículo</Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={vehicleId}
              onChange={setVehicleId}
              options={vehicles.map((v) => ({ value: v.id, label: `${v.licensePlate} — ${v.brand} ${v.model}` }))}
              placeholder="Todos os veículos"
              searchPlaceholder="Buscar veículo..."
              emptyMessage="Nenhum veículo encontrado."
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhum tipo de manutenção com intervalo configurado.</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-3 whitespace-nowrap">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.veiculo}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.placa}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.tipoManutencao}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmPrevista?.toLocaleString('pt-BR') ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmAtual.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={STATUS_BADGE[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.dataUltima)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.dataPrevista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
