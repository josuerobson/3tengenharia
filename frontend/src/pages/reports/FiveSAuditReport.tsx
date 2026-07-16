// src/pages/reports/FiveSAuditReport.tsx
// Relatórios > 5S > Auditoria 5S por Área
// Reaproveita GET /5s/reports (fiveSApi.list) — mesma rota do Painel de Qualidade,
// gated também por reports.fiveS (ver fiveS.routes.ts).

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { fiveSApi, worksitesApi, type ApiAudit5S, type ApiWorksite } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'data', label: 'Data' },
  { key: 'obra', label: 'Obra' },
  { key: 'area', label: 'Área' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'status', label: 'Status' },
  { key: 'descricao', label: 'Descrição' },
]

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR')
}

function toRow(audit: ApiAudit5S) {
  return {
    data: formatDate(audit.createdAt),
    obra: `${audit.worksite.code} — ${audit.worksite.name}`,
    area: audit.areaType,
    auditor: audit.auditorEmployee.fullName,
    status: audit.status === 'CONFORME' ? 'Conforme' : 'Não Conforme',
    descricao: audit.description ?? '—',
  }
}

export default function FiveSAuditReport({ onBack }: { onBack: () => void }) {
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [worksiteId, setWorksiteId] = useState('')
  const [status, setStatus] = useState('')
  const [audits, setAudits] = useState<ApiAudit5S[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  useEffect(() => {
    worksitesApi.list().then(setWorksites).catch(() => setWorksites([]))
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    fiveSApi
      .list({ worksiteId: worksiteId || undefined, status: status || undefined, limit: 100 })
      .then((res) => setAudits(res.audits))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [worksiteId, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const rows = audits.map(toRow)
      if (format === 'pdf') {
        await exportReportToPdf('Auditoria 5S por Área', COLUMNS, rows)
      } else {
        await exportReportToExcel('Auditoria 5S por Área', COLUMNS, rows)
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
          <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')} disabled={exporting !== null || audits.length === 0}>
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport('excel')} disabled={exporting !== null || audits.length === 0}>
            {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />}
            Excel
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900">Auditoria 5S por Área</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Obra / Área</Label>
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
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Todos</option>
            <option value="CONFORME">Conforme</option>
            <option value="NAO_CONFORME">Não Conforme</option>
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
        ) : audits.length === 0 ? (
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
              {audits.map((audit) => {
                const row = toRow(audit)
                return (
                  <tr key={audit.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.data}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.obra}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.area}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.auditor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={audit.status === 'CONFORME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{row.descricao}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
