// src/pages/reports/WorkedHoursReport.tsx
// Relatórios > Rateio de Horas > Horas Trabalhadas

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, worksitesApi, type WorkedHoursRow, type WorkedHoursSummaryRow, type ApiWorksite } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'centroDeCusto', label: 'Centro de Custo' },
  { key: 'funcionario', label: 'Funcionário' },
  { key: 'data', label: 'Data' },
  { key: 'horarioChegada', label: 'Chegada' },
  { key: 'horarioSaida', label: 'Saída' },
  { key: 'intervalo', label: 'Intervalo' },
  { key: 'totalHorasDia', label: 'Total Horas' },
  { key: 'horasExtras', label: 'Horas Extras' },
]

function formatTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function WorkedHoursReport({ onBack }: { onBack: () => void }) {
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [worksiteId, setWorksiteId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<WorkedHoursRow[]>([])
  const [summary, setSummary] = useState<WorkedHoursSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    worksitesApi.list().then(setWorksites).catch(() => setWorksites([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    reportsApi
      .workedHours({
        worksiteId: worksiteId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => {
        setRows(res.rows)
        setSummary(res.summary)
      })
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [worksiteId, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({
        ...r,
        data: formatDate(r.data),
        horarioChegada: formatTime(r.horarioChegada),
        horarioSaida: formatTime(r.horarioSaida),
      }))
      if (format === 'pdf') {
        await exportReportToPdf('Horas Trabalhadas', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Horas Trabalhadas', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Horas Trabalhadas</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Centro de Custo</Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={worksiteId}
              onChange={setWorksiteId}
              options={worksites.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
              placeholder="Todas as obras"
              searchPlaceholder="Buscar obra..."
              emptyMessage="Nenhuma obra encontrada."
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
            <Card key={s.worksiteId} className="p-4">
              <p className="text-xs font-semibold text-gray-400">{s.centroDeCusto}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.totalHorasPeriodo}h no período</p>
              <p className="text-xs text-gray-500 mt-0.5">Média diária: {s.mediaDiaria}h</p>
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
          <div className="text-center py-12 text-sm text-gray-400">Nenhum lançamento encontrado para os filtros selecionados.</div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.centroDeCusto}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.funcionario}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.data)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatTime(row.horarioChegada)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatTime(row.horarioSaida)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.intervalo ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.totalHorasDia}h</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.horasExtras}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
