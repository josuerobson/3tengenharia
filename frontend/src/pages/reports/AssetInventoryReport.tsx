// src/pages/reports/AssetInventoryReport.tsx
// Relatórios > Ferramentas e Equipamentos > Inventário de Ferramentas e Equipamentos

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge, ASSET_STATUS_BADGE } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { reportsApi, assetsApi, type AssetInventoryRow, type AssetCategory } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'codigoPatrimonio', label: 'Código' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'marcaModelo', label: 'Marca / Modelo' },
  { key: 'status', label: 'Status' },
  { key: 'localizacao', label: 'Localização' },
  { key: 'ultimaManutencao', label: 'Última Manutenção' },
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'LOANED', label: 'Emprestado' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
  { value: 'DAMAGED', label: 'Danificado' },
  { value: 'WRITTEN_OFF', label: 'Baixado' },
  { value: 'RETURNING', label: 'Em Devolução' },
]

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function AssetInventoryReport({ onBack }: { onBack: () => void }) {
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<AssetInventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    assetsApi.listCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    reportsApi
      .assetInventory({ categoryId: categoryId || undefined, status: status || undefined })
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [categoryId, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const formatted = rows.map((r) => ({
        ...r,
        status: ASSET_STATUS_BADGE[r.status]?.label ?? r.status,
        ultimaManutencao: formatDate(r.ultimaManutencao),
      }))
      if (format === 'pdf') {
        await exportReportToPdf('Inventário de Ferramentas e Equipamentos', COLUMNS, formatted)
      } else {
        await exportReportToExcel('Inventário de Ferramentas e Equipamentos', COLUMNS, formatted)
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

      <h2 className="text-lg font-bold text-gray-900">Inventário de Ferramentas e Equipamentos</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
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
          <div className="text-center py-12 text-sm text-gray-400">Nenhum bem encontrado para os filtros selecionados.</div>
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.codigoPatrimonio}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.descricao}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.categoria}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.marcaModelo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={ASSET_STATUS_BADGE[row.status]?.variant}>{ASSET_STATUS_BADGE[row.status]?.label ?? row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.localizacao}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.ultimaManutencao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
