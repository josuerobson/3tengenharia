// src/pages/reports/AssetMaintenanceReport.tsx
// Relatórios > Ferramentas e Equipamentos > Manutenções de Ferramentas

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, assetsApi, type AssetMaintenanceReportRow, type AssetCategory } from '@/lib/api'
import { type Asset } from '@/data/mockData'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'dataManutencao', label: 'Data' },
  { key: 'categoriaPatrimonio', label: 'Categoria / Patrimônio' },
  { key: 'descricaoManutencao', label: 'Descrição' },
  { key: 'custo', label: 'Custo' },
  { key: 'responsavelReparo', label: 'Responsável' },
  { key: 'status', label: 'Status' },
]

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AssetMaintenanceReport({ onBack }: { onBack: () => void }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [assetId, setAssetId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<AssetMaintenanceReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    assetsApi.list().then(setAssets).catch(() => setAssets([]))
    assetsApi.listCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    reportsApi
      .assetMaintenance({
        assetId: assetId || undefined,
        categoryId: categoryId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [assetId, categoryId, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({ ...r, dataManutencao: formatDate(r.dataManutencao), custo: formatCurrency(r.custo) as any }))
      if (format === 'pdf') {
        await exportReportToPdf('Manutenções de Ferramentas', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Manutenções de Ferramentas', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Manutenções de Ferramentas</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <Label>Categoria</Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Todas as categorias"
              searchPlaceholder="Buscar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
            />
          </div>
        </div>
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
          <div className="text-center py-12 text-sm text-gray-400">Nenhuma manutenção encontrada para os filtros selecionados.</div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.dataManutencao)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.categoriaPatrimonio}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{row.descricaoManutencao}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatCurrency(row.custo)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.responsavelReparo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={row.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
