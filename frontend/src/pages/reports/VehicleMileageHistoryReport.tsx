// src/pages/reports/VehicleMileageHistoryReport.tsx
// Relatórios > Controle de Veículos > Histórico de Quilometragem por Veículo

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  reportsApi,
  vehiclesApi,
  type VehicleMileageHistoryRow,
  type VehicleMileageHistorySummaryRow,
  type ApiVehicle,
} from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'veiculo', label: 'Veículo' },
  { key: 'placa', label: 'Placa' },
  { key: 'data', label: 'Data' },
  { key: 'kmInicial', label: 'KM Inicial' },
  { key: 'kmFinal', label: 'KM Final' },
  { key: 'kmTotalPeriodo', label: 'KM no Dia' },
  { key: 'kmAcumulado', label: 'KM Acumulado' },
]

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export default function VehicleMileageHistoryReport({ onBack }: { onBack: () => void }) {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([])
  const [vehicleId, setVehicleId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<VehicleMileageHistoryRow[]>([])
  const [summary, setSummary] = useState<VehicleMileageHistorySummaryRow[]>([])
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
      .vehicleMileageHistory({ vehicleId: vehicleId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((res) => {
        setRows(res.rows)
        setSummary(res.summary)
      })
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [vehicleId, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({ ...r, data: formatDate(r.data) }))
      if (format === 'pdf') {
        await exportReportToPdf('Histórico de Quilometragem por Veículo', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Histórico de Quilometragem por Veículo', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Histórico de Quilometragem por Veículo</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div>
          <Label htmlFor="dateFrom">De</Label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
          />
        </div>
        <div>
          <Label htmlFor="dateTo">Até</Label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
          />
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.map((s) => (
            <Card key={`${s.veiculo}-${s.placa}`} className="p-4">
              <p className="text-xs font-semibold text-gray-400">{s.veiculo} — {s.placa}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.mediaDiaria} km/dia</p>
              <p className="text-xs text-gray-500 mt-0.5">Média no período</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhuma viagem encontrada para os filtros selecionados.</div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.data)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmInicial.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmFinal.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmTotalPeriodo.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.kmAcumulado.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
