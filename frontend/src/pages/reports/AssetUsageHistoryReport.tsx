// src/pages/reports/AssetUsageHistoryReport.tsx
// Relatórios > Ferramentas e Equipamentos > Histórico de Uso por Ferramenta

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, assetsApi, type AssetUsageHistoryRow } from '@/lib/api'
import { type Asset } from '@/data/mockData'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'codigoPatrimonio', label: 'Patrimônio' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'vezesEmprestado', label: 'Vezes Emprestado' },
  { key: 'totalDiasEmUso', label: 'Total Dias em Uso' },
  { key: 'funcionariosQueMaisUtilizaram', label: 'Funcionários que Mais Utilizaram' },
  { key: 'manutencoesRealizadas', label: 'Manutenções' },
  { key: 'estadoAtual', label: 'Estado Atual' },
]

export default function AssetUsageHistoryReport({ onBack }: { onBack: () => void }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<AssetUsageHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    assetsApi.list().then(setAssets).catch(() => setAssets([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    reportsApi
      .assetUsageHistory({ assetId: assetId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [assetId, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({ ...r }))
      if (format === 'pdf') {
        await exportReportToPdf('Histórico de Uso por Ferramenta', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Histórico de Uso por Ferramenta', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Histórico de Uso por Ferramenta</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Patrimônio</Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={assetId}
              onChange={setAssetId}
              options={assets.map((a) => ({ value: a.id, label: `${a.assetTag} — ${a.categoryData?.name ?? a.category}` }))}
              placeholder="Todos os bens"
              searchPlaceholder="Buscar patrimônio..."
              emptyMessage="Nenhum bem encontrado."
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

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhum uso ou manutenção registrado para os filtros selecionados.</div>
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
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {(row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
