// src/pages/assets/AssetCatalogPage.tsx
// Catálogo de bens patrimoniais em grid de cards mobile-first.
// Inclui pesquisa por código/descrição, filtro por status,
// e Modal de Relato de Defeito com campo de captura de foto nativa.

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Package,
  Search,
  Wrench,
  Zap,
  Ruler,
  Shield,
  Wind,
  BarChart2,
  AlertCircle,
  Camera,
  X,
  CheckCircle2,
  MapPin,
  Tag,
  Loader2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, ASSET_STATUS_BADGE } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import {
  MOCK_ASSETS,
  ASSET_CATEGORY_LABELS,
  type Asset,
  type AssetCategory,
  type AssetStatus,
} from '@/data/mockData'

// ── Ícone por categoria ───────────────────────────────────────────────────────

function CategoryIcon({ category, size = 20 }: { category: AssetCategory; size?: number }) {
  const icons: Record<AssetCategory, React.ElementType> = {
    POWER_TOOLS: Wrench,
    HAND_TOOLS: Wrench,
    MEASUREMENT: Ruler,
    SAFETY: Shield,
    PNEUMATIC: Wind,
    LIFTING: BarChart2,
    ELECTRICAL: Zap,
    OTHER: Package,
  }
  const Icon = icons[category] ?? Package
  return <Icon size={size} />
}

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  POWER_TOOLS: 'bg-blue-100 text-blue-600',
  HAND_TOOLS:  'bg-teal-100 text-teal-600',
  MEASUREMENT: 'bg-purple-100 text-purple-600',
  SAFETY:      'bg-emerald-100 text-emerald-600',
  PNEUMATIC:   'bg-cyan-100 text-cyan-600',
  LIFTING:     'bg-orange-100 text-orange-600',
  ELECTRICAL:  'bg-yellow-100 text-yellow-600',
  OTHER:       'bg-gray-100 text-gray-600',
}

// ── Modal de Relato de Defeito ────────────────────────────────────────────────

interface DefectReportModalProps {
  asset: Asset | null
  onClose: () => void
  onSubmit: (assetId: string, description: string, photo: File | null) => Promise<void>
}

function DefectReportModal({ asset, onClose, onSubmit }: DefectReportModalProps) {
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Limpa state ao fechar / abrir novo asset
  useEffect(() => {
    if (!asset) {
      setDescription('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setError('')
      setSubmitted(false)
      setIsSubmitting(false)
    }
  }, [asset])

  // Revoga URL de objeto ao desmontar ou trocar preview
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(file)
      setPhotoPreview(file ? URL.createObjectURL(file) : null)
    },
    [photoPreview],
  )

  const handleRemovePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [photoPreview])

  const handleSubmit = async () => {
    if (!asset) return
    if (description.trim().length < 10) {
      setError('Descreva o problema com pelo menos 10 caracteres.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(asset.id, description.trim(), photoFile)
      setSubmitted(true)
    } catch {
      setError('Erro ao enviar o relato. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!asset) return null

  const statusInfo = ASSET_STATUS_BADGE[asset.currentStatus]

  return (
    <Dialog
      open={!!asset}
      onClose={onClose}
      title="Relatar Defeito"
      description={`${asset.assetTag} — ${asset.description}`}
    >
      {submitted ? (
        // ── Tela de confirmação ──
        <div className="py-6 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Avaria Reportada!</h3>
          <p className="text-sm text-gray-500 mt-1 mb-2">
            O bem <span className="font-semibold">{asset.assetTag}</span> foi movido para
            status <span className="font-semibold text-amber-600">Manutenção</span>.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Um chamado foi aberto e o gestor responsável será notificado.
          </p>
          <Button size="lg" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        // ── Formulário ──
        <div className="space-y-5 pt-2">
          {/* Info do bem */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                CATEGORY_COLORS[asset.category],
              )}
            >
              <CategoryIcon category={asset.category} size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-sm truncate">
                {asset.description}
              </p>
              <p className="text-xs text-gray-500">
                {asset.brand} {asset.model} · {asset.assetTag}
              </p>
            </div>
            <Badge variant={statusInfo?.variant} dot>
              {statusInfo?.label}
            </Badge>
          </div>

          {/* Descrição da avaria */}
          <div>
            <Label htmlFor="defect-description" required>
              Descrição do Problema
            </Label>
            <Textarea
              id="defect-description"
              placeholder="Descreva detalhadamente a avaria, o que aconteceu, quando notou o problema e qualquer informação relevante..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (error) setError('')
              }}
              rows={4}
              error={error || undefined}
              className="resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-1">
              {description.length} / 2000 caracteres
            </p>
          </div>

          {/* Campo de foto */}
          <div>
            <Label>Foto do Defeito (opcional)</Label>
            <p className="text-xs text-gray-400 mb-2">
              Em dispositivos móveis, toca o botão para abrir a câmera diretamente.
            </p>

            {/* Input nativo oculto — capture="environment" abre câmera traseira no mobile */}
            <input
              ref={fileInputRef}
              id="defect-photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />

            {photoPreview ? (
              // Preview da foto selecionada
              <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200">
                <img
                  src={photoPreview}
                  alt="Foto do defeito"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full
                             flex items-center justify-center text-white hover:bg-black/80
                             transition-colors"
                  aria-label="Remover foto"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-2">
                  <p className="text-white text-xs font-medium truncate">
                    {photoFile?.name}
                  </p>
                </div>
              </div>
            ) : (
              // Área de upload / câmera
              <label
                htmlFor="defect-photo"
                className="flex flex-col items-center justify-center w-full h-40
                           border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer
                           hover:border-brand-primary/50 hover:bg-brand-primary/5
                           active:bg-brand-primary/10 transition-all duration-150
                           gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-brand-primary/10
                               flex items-center justify-center transition-colors">
                  <Camera size={22} className="text-gray-400 group-hover:text-brand-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-primary transition-colors">
                    Tirar foto ou selecionar arquivo
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    JPG, PNG ou WEBP · Máx. 10 MB
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Botão de envio */}
          <Button
            variant="accent"
            size="lg"
            className="w-full font-bold shadow-lg shadow-brand-accent/20"
            onClick={handleSubmit}
            disabled={isSubmitting || description.trim().length < 10}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando relato...
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                Confirmar Relato de Avaria
              </>
            )}
          </Button>
        </div>
      )}
    </Dialog>
  )
}

// ── Card de bem patrimonial ───────────────────────────────────────────────────

interface AssetCardProps {
  asset: Asset
  onReportDefect: (asset: Asset) => void
}

function AssetCard({ asset, onReportDefect }: AssetCardProps) {
  const statusInfo = ASSET_STATUS_BADGE[asset.currentStatus]
  const canReportDefect = asset.currentStatus !== 'WRITTEN_OFF'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card flex flex-col
                    transition-all duration-150 hover:shadow-card-hover hover:-translate-y-0.5
                    animate-fade-in-up">
      {/* Header do card */}
      <div className="p-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              CATEGORY_COLORS[asset.category],
            )}
          >
            <CategoryIcon category={asset.category} size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Tag size={11} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs font-bold text-brand-primary truncate">
                {asset.assetTag}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {ASSET_CATEGORY_LABELS[asset.category]}
            </p>
          </div>
        </div>
        <Badge variant={statusInfo?.variant ?? 'default'} dot className="flex-shrink-0">
          {statusInfo?.label ?? asset.currentStatus}
        </Badge>
      </div>

      {/* Corpo */}
      <div className="px-4 flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
          {asset.description}
        </h3>
        {(asset.brand || asset.model) && (
          <p className="text-xs text-gray-500 mb-2">
            {[asset.brand, asset.model].filter(Boolean).join(' ')}
          </p>
        )}
        {asset.currentBorrowee && (
          <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mb-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            Em uso: {asset.currentBorrowee}
          </p>
        )}
      </div>

      {/* Localização */}
      {asset.location && (
        <div className="px-4 pb-3 mt-2">
          <p className="text-[11px] text-gray-400 flex items-start gap-1">
            <MapPin size={11} className="flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{asset.location}</span>
          </p>
        </div>
      )}

      {/* Footer com ação */}
      <div className="px-4 pb-4 mt-auto pt-3 border-t border-gray-50">
        {canReportDefect ? (
          <button
            onClick={() => onReportDefect(asset)}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2.5 px-3',
              'text-xs font-semibold rounded-xl transition-all duration-150',
              'border border-dashed',
              asset.currentStatus === 'AVAILABLE' || asset.currentStatus === 'LOANED'
                ? 'text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300 active:bg-amber-100'
                : 'text-red-500 border-red-200 hover:bg-red-50 active:bg-red-100',
            )}
          >
            <AlertCircle size={13} />
            Relatar Defeito
          </button>
        ) : (
          <p className="text-center text-xs text-gray-300 py-1.5">Bem baixado</p>
        )}
      </div>
    </div>
  )
}

// ── Barra de estatísticas rápida ──────────────────────────────────────────────

function StatsStrip({ assets }: { assets: Asset[] }) {
  const counts = assets.reduce(
    (acc, a) => {
      acc[a.currentStatus] = (acc[a.currentStatus] ?? 0) + 1
      return acc
    },
    {} as Record<AssetStatus, number>,
  )

  const stats = [
    { label: 'Disponível', count: counts.AVAILABLE ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Emprestado', count: counts.LOANED ?? 0,    color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Manutenção', count: counts.MAINTENANCE ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Danificado', count: counts.DAMAGED ?? 0,   color: 'text-red-600',     bg: 'bg-red-50' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {stats.map((s) => (
        <div key={s.label} className={cn('rounded-2xl p-3 text-center', s.bg)}>
          <p className={cn('text-2xl font-extrabold tabular-nums', s.color)}>{s.count}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | AssetStatus

export default function AssetCatalogPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [reportingAsset, setReportingAsset] = useState<Asset | null>(null)

  // Filtragem combinada
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim()
    return MOCK_ASSETS.filter((a) => {
      const matchesSearch =
        !q ||
        a.assetTag.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q) ||
        (a.model ?? '').toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'ALL' || a.currentStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  const handleDefectSubmit = useCallback(
    async (_assetId: string, _description: string, _photo: File | null) => {
      // Simulação de chamada à API (substituir na Etapa 6)
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    },
    [],
  )

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'ALL',         label: 'Todos' },
    { id: 'AVAILABLE',   label: 'Disponível' },
    { id: 'LOANED',      label: 'Emprestado' },
    { id: 'MAINTENANCE', label: 'Manutenção' },
    { id: 'DAMAGED',     label: 'Danificado' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Ferramentas & Equipamentos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Catálogo de {MOCK_ASSETS.length} itens patrimoniais
          </p>
        </div>
        <Button size="md" className="flex-shrink-0">
          <Plus size={16} />
          Novo Item
        </Button>
      </div>

      {/* ── Strip de estatísticas ──────────────────────────────────────── */}
      <StatsStrip assets={MOCK_ASSETS} />

      {/* ── Barra de busca ────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código patrimonial, descrição ou marca..."
          className="w-full h-12 pl-11 pr-4 text-sm rounded-xl border border-gray-200 bg-white
                     focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                     transition-all duration-150 placeholder:text-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400
                       hover:text-gray-600 transition-colors"
            aria-label="Limpar busca"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Filtros de status (scroll horizontal no mobile) ─────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {statusTabs.map((tab) => {
          const count =
            tab.id === 'ALL'
              ? MOCK_ASSETS.length
              : MOCK_ASSETS.filter((a) => a.currentStatus === tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold',
                'whitespace-nowrap transition-all duration-150 border flex-shrink-0',
                statusFilter === tab.id
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary/40',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Grid de cards ─────────────────────────────────────────────── */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Package size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">Nenhum item encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onReportDefect={setReportingAsset}
            />
          ))}
        </div>
      )}

      {/* ── Modal de Relato de Defeito ─────────────────────────────────── */}
      <DefectReportModal
        asset={reportingAsset}
        onClose={() => setReportingAsset(null)}
        onSubmit={handleDefectSubmit}
      />
    </div>
  )
}
