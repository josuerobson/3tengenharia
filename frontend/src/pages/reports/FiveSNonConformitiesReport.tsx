// src/pages/reports/FiveSNonConformitiesReport.tsx
// Relatórios > 5S > Não Conformidades 5S — Pendentes e Resolvidas
// Reaproveita GET /5s/reports (fiveSApi.list), já gated por fiveS.panel OU
// reports.fiveS, filtrado sempre a NAO_CONFORME (ver fiveS.routes.ts).
//
// O documento de especificação pede status "Pendente / Em andamento / Resolvida",
// que não existe verbatim no schema — mapeado a partir de `validation`:
// AGUARDANDO_AVALIACAO → Pendente, REPROVADO → Em andamento (requer nova ação),
// APROVADO → Resolvida. "Evidência de correção" usa a presença de fotos como proxy,
// já que o modelo não tem um campo de foto pós-correção dedicado.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Loader2, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { fiveSApi, worksitesApi, type ApiAudit5S, type ApiWorksite } from '@/lib/api'
import { exportReportToPdf, exportReportToExcel, type ReportColumn } from '@/lib/reportExport'

const COLUMNS: ReportColumn[] = [
  { key: 'dataRegistro', label: 'Data de Registro' },
  { key: 'area', label: 'Área' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'status', label: 'Status' },
  { key: 'dataResolucao', label: 'Data de Resolução' },
  { key: 'evidenciaCorrecao', label: 'Evidência de Correção' },
]

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  AGUARDANDO_AVALIACAO: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  REPROVADO: { label: 'Em andamento', className: 'bg-orange-100 text-orange-700' },
  APROVADO: { label: 'Resolvida', className: 'bg-emerald-100 text-emerald-700' },
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function toRow(audit: ApiAudit5S) {
  return {
    dataRegistro: formatDate(audit.createdAt),
    area: `${audit.worksite.code} — ${audit.areaType}`,
    descricao: audit.description ?? '—',
    status: STATUS_MAP[audit.validation]?.label ?? audit.validation,
    dataResolucao: audit.validation === 'APROVADO' ? formatDate(audit.validatedAt) : '—',
    evidenciaCorrecao: audit.photos.length > 0 ? 'Sim' : 'Não',
  }
}

export default function FiveSNonConformitiesReport({ onBack }: { onBack: () => void }) {
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [worksiteId, setWorksiteId] = useState('')
  const [validation, setValidation] = useState('')
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
      .list({ worksiteId: worksiteId || undefined, status: 'NAO_CONFORME', validation: validation || undefined, limit: 100 })
      .then((res) => setAudits(res.audits))
      .catch((err) => setError(err?.message ?? 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [worksiteId, validation])

  useEffect(() => {
    loadData()
  }, [loadData])

  const avgResolutionDays = useMemo(() => {
    const resolved = audits.filter((a) => a.validation === 'APROVADO' && a.validatedAt)
    if (resolved.length === 0) return null
    const totalDays = resolved.reduce((sum, a) => {
      const days = (new Date(a.validatedAt!).getTime() - new Date(a.createdAt).getTime()) / 86400000
      return sum + Math.max(0, days)
    }, 0)
    return Number((totalDays / resolved.length).toFixed(1))
  }, [audits])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const rows = audits.map(toRow)
      if (format === 'pdf') {
        await exportReportToPdf('Não Conformidades 5S — Pendentes e Resolvidas', COLUMNS, rows)
      } else {
        await exportReportToExcel('Não Conformidades 5S — Pendentes e Resolvidas', COLUMNS, rows)
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

      <h2 className="text-lg font-bold text-gray-900">Não Conformidades 5S — Pendentes e Resolvidas</h2>

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Obra</Label>
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
          <Label htmlFor="validation">Status</Label>
          <select
            id="validation"
            value={validation}
            onChange={(e) => setValidation(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Todos</option>
            <option value="AGUARDANDO_AVALIACAO">Pendente</option>
            <option value="REPROVADO">Em andamento</option>
            <option value="APROVADO">Resolvida</option>
          </select>
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {avgResolutionDays !== null && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-400">Tempo médio de resolução</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{avgResolutionDays} dias</p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nenhuma não conformidade encontrada para os filtros selecionados.</div>
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
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.dataRegistro}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.area}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{row.descricao}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={STATUS_MAP[audit.validation]?.className}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.dataResolucao}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.evidenciaCorrecao}</td>
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
