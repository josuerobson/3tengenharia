// src/pages/reports/FiveSEvolutionReport.tsx
// Relatórios > 5S > Evolução 5S por Período

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, worksitesApi, type FiveSEvolutionRow, type ApiWorksite } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'mes', label: 'Mês/Ano' },
  { key: 'centroDeCusto', label: 'Centro de Custo' },
  { key: 'percentualConformidade', label: '% Conformidade' },
  { key: 'quantidadeNaoConformidades', label: 'Não Conformidades' },
  { key: 'quantidadeCorrecoes', label: 'Correções Realizadas' },
]

function formatMonth(value: string): string {
  const [year, month] = value.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function FiveSEvolutionReport({ onBack }: { onBack: () => void }) {
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [worksiteId, setWorksiteId] = useState('')
  const [areaType, setAreaType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<FiveSEvolutionRow[]>([])
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
      .fiveSEvolution({
        worksiteId: worksiteId || undefined,
        areaType: areaType.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [worksiteId, areaType, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({ ...r, mes: formatMonth(r.mes) }))
      if (format === 'pdf') {
        await exportReportToPdf('Evolução 5S por Período', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Evolução 5S por Período', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Evolução 5S por Período</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
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
          <Label htmlFor="areaType">Área</Label>
          <input
            id="areaType"
            type="text"
            value={areaType}
            onChange={(e) => setAreaType(e.target.value)}
            placeholder="Ex: Canteiro, Almoxarifado..."
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
          />
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

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhuma auditoria encontrada para os filtros selecionados.</div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 capitalize">{formatMonth(row.mes)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.centroDeCusto}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.percentualConformidade}%</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.quantidadeNaoConformidades}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.quantidadeCorrecoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
