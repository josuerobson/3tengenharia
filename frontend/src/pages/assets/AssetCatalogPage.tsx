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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi } from '@/lib/api'
import {
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

// ── Modal de Novo Item Patrimonial ─────────────────────────────────────────────

interface NewAssetModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    assetTag: string
    description: string
    category: string
    brand?: string | null
    model?: string | null
    serialNumber?: string | null
    acquisitionDate?: string | null
    acquisitionValue?: number | null
    location?: string | null
    notes?: string | null
    photoUrl?: string | null
  }) => Promise<void>
}

function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(event.target?.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

function NewAssetModal({ open, onClose, onSubmit }: NewAssetModalProps) {
  const [assetTag, setAssetTag] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AssetCategory>('POWER_TOOLS')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [acquisitionValue, setAcquisitionValue] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Foto para novo cadastro
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)

  // Limpa state ao abrir/fechar
  useEffect(() => {
    if (open) {
      setAssetTag('')
      setDescription('')
      setCategory('POWER_TOOLS')
      setBrand('')
      setModel('')
      setSerialNumber('')
      setAcquisitionDate('')
      setAcquisitionValue('')
      setLocation('')
      setNotes('')
      setPhotoPreview(null)
      setPhotoBase64(null)
      setError('')
      setIsSubmitting(false)
    } else {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [open])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)

    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.6)
        setPhotoBase64(compressed)
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err)
        const reader = new FileReader()
        reader.onloadend = () => {
          setPhotoBase64(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    } else {
      setPhotoBase64(null)
    }
  }

  const handleRemovePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setPhotoBase64(null)
  }, [photoPreview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetTag.trim()) {
      setError('Código Patrimonial é obrigatório.')
      return
    }
    if (!description.trim()) {
      setError('Descrição é obrigatória.')
      return
    }
    if (!category) {
      setError('Categoria é obrigatória.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit({
        assetTag: assetTag.trim(),
        description: description.trim(),
        category,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : null,
        acquisitionValue: acquisitionValue ? parseFloat(acquisitionValue) : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        photoUrl: photoBase64 || null,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao cadastrar o item. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo Item Patrimonial"
      description="Cadastre uma ferramenta, equipamento ou EPI no sistema."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
            <span className="font-bold mt-0.5">⚠</span>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="assetTag" required>
              Código Patrimonial
            </Label>
            <Input
              id="assetTag"
              placeholder="Ex: PAT-0001"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              className="mt-1.5 h-11"
              required
            />
          </div>

          <div>
            <Label htmlFor="category" required>
              Categoria
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
              required
            >
              {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description" required>
            Descrição
          </Label>
          <Input
            id="description"
            placeholder="Ex: Furadeira de Impacto 13mm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 h-11"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              placeholder="Ex: Bosch"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>

          <div>
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              placeholder="Ex: GSB 13 RE"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="serialNumber">Número de Série</Label>
            <Input
              id="serialNumber"
              placeholder="Ex: BSH-2024-0001"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>

          <div>
            <Label htmlFor="location">Localização Inicial</Label>
            <Input
              id="location"
              placeholder="Ex: Almoxarifado Central"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acquisitionDate">Data de Aquisição</Label>
            <Input
              id="acquisitionDate"
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>

          <div>
            <Label htmlFor="acquisitionValue">Valor de Aquisição</Label>
            <Input
              id="acquisitionValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 485.90"
              value={acquisitionValue}
              onChange={(e) => setAcquisitionValue(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            placeholder="Informações adicionais sobre o estado do item, acessórios inclusos, etc..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1.5 resize-none"
          />
        </div>

        <div>
          <Label>Foto do Equipamento (Opcional)</Label>
          {photoPreview ? (
            <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-w-sm mt-1.5">
              <img
                src={photoPreview}
                alt="Preview do Equipamento"
                className="w-full h-48 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 rounded-full shadow-md"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full mt-1.5">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <Camera className="w-6 h-6 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500 font-medium">Tire ou anexe uma foto</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG (máx. 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full font-bold shadow-lg shadow-brand-primary/20"
          disabled={isSubmitting || !assetTag.trim() || !description.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Salvando item...
            </>
          ) : (
            <>
              <Plus size={18} />
              Cadastrar Item
            </>
          )}
        </Button>
      </form>
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

      {/* Imagem do item (se houver) */}
      {asset.photoUrl && (
        <div className="px-4 pb-2">
          <img
            src={asset.photoUrl}
            alt={asset.description}
            className="w-full h-32 object-cover rounded-xl border border-gray-100"
          />
        </div>
      )}

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
  const { user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [reportingAsset, setReportingAsset] = useState<Asset | null>(null)
  const [newAssetModalOpen, setNewAssetModalOpen] = useState(false)

  // Buscar itens do backend
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      setApiError('')
      const data = await assetsApi.list()
      setAssets(data)
    } catch (err: any) {
      console.error('Erro ao carregar bens:', err)
      setApiError(err?.message ?? 'Falha ao carregar catálogo de bens.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Filtragem combinada
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim()
    return assets.filter((a) => {
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
  }, [assets, search, statusFilter])

  const handleDefectSubmit = useCallback(
    async (assetId: string, description: string, _photo: File | null) => {
      // Registrar a avaria real no banco
      await assetsApi.reportDefect({
        assetId,
        issueDescription: description,
      })
      await fetchAssets()
    },
    [fetchAssets],
  )

  const handleNewAssetSubmit = useCallback(
    async (data: any) => {
      await assetsApi.create(data)
      await fetchAssets()
    },
    [fetchAssets],
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
            {loading ? 'Carregando bens patrimoniais...' : `Catálogo de ${assets.length} itens patrimoniais`}
          </p>
        </div>
        {canCreate && (
          <Button size="md" className="flex-shrink-0" onClick={() => setNewAssetModalOpen(true)}>
            <Plus size={16} />
            Novo Item
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-card animate-pulse">
          <Loader2 size={36} className="text-brand-primary animate-spin mb-3" />
          <p className="text-gray-500 text-sm font-medium">Buscando itens patrimoniais do servidor...</p>
        </div>
      ) : apiError ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-card">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">Erro ao carregar catálogo</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">{apiError}</p>
          <Button size="sm" variant="outline" onClick={fetchAssets}>
            Tentar Novamente
          </Button>
        </div>
      ) : (
        <>
          {/* ── Strip de estatísticas ──────────────────────────────────────── */}
          <StatsStrip assets={assets} />

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
                  ? assets.length
                  : assets.filter((a) => a.currentStatus === tab.id).length
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
        </>
      )}

      {/* ── Modal de Relato de Defeito ─────────────────────────────────── */}
      <DefectReportModal
        asset={reportingAsset}
        onClose={() => setReportingAsset(null)}
        onSubmit={handleDefectSubmit}
      />

      {/* ── Modal de Novo Item ─────────────────────────────────────────── */}
      <NewAssetModal
        open={newAssetModalOpen}
        onClose={() => setNewAssetModalOpen(false)}
        onSubmit={handleNewAssetSubmit}
      />
    </div>
  )
}
