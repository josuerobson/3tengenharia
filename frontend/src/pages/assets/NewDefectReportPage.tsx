// src/pages/assets/NewDefectReportPage.tsx
// Formulário para registro de avaria / chamado de manutenção de bens patrimoniais.

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Camera,
  X,
  Tag,
  MapPin,
  ClipboardList,
  ChevronRight,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge, ASSET_STATUS_BADGE } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi } from '@/lib/api'
import { type Asset } from '@/data/mockData'

// Import dinâmico: pdf-lib só é baixado quando o usuário realmente gera um PDF.
const generateDefectReportPdf: typeof import('@/lib/defectReportPdf').generateDefectReportPdf = (input) =>
  import('@/lib/defectReportPdf').then((mod) => mod.generateDefectReportPdf(input))

function compressImage(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function NewDefectReportPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Estados de Busca/Seleção ────────────────────────────────────────────────
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [issueDescription, setIssueDescription] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)

  // Estados da foto do defeito
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false)

  // Estados de Submissão
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successLog, setSuccessLog] = useState<any | null>(null)

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    try {
      setLoadingData(true)
      setFetchError(null)
      const data = await assetsApi.list()
      setAssets(data)
    } catch (err: any) {
      console.error('Erro ao carregar bens:', err)
      setFetchError(err?.message ?? 'Falha ao buscar bens no servidor.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadAssets()
    }
  }, [isAuthenticated, loadAssets])

  // Cleanup object URL preview to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  // ── Filtros ────────────────────────────────────────────────────────────────
  // Só podemos relatar avarias em bens que NÃO estão já em manutenção
  const reportableAssets = useMemo(() => {
    const q = assetSearch.toLowerCase().trim()
    return assets.filter(
      (a) =>
        a.currentStatus !== 'MAINTENANCE' &&
        a.currentStatus !== 'WRITTEN_OFF' &&
        (a.description.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          (a.brand ?? '').toLowerCase().includes(q) ||
          (a.model ?? '').toLowerCase().includes(q)),
    )
  }, [assets, assetSearch])

  // ── Handlers de Foto ───────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
    setPhotoBase64(null)

    if (file) {
      setIsCompressingPhoto(true)
      try {
        const compressed = await compressImage(file)
        setPhotoBase64(compressed)
      } catch (err) {
        console.error('Erro ao comprimir foto do defeito:', err)
      } finally {
        setIsCompressingPhoto(false)
      }
    }
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setPhotoBase64(null)
  };

  // ── Handlers do Form ───────────────────────────────────────────────────────
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setShowAssetDropdown(false)
    setAssetSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) {
      setSubmitError('Selecione um bem patrimonial.')
      return
    }
    if (issueDescription.trim().length < 10) {
      setSubmitError('A descrição da avaria deve ter pelo menos 10 caracteres.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await assetsApi.reportDefect({
        assetId: selectedAsset.id,
        issueDescription: issueDescription.trim(),
        defectPhotoUrl: photoBase64 ?? undefined,
      })
      setSuccessLog({
        ...res.maintenanceLog,
        asset: selectedAsset,
      })
      // Reset form
      setSelectedAsset(null)
      setIssueDescription('')
      handleRemovePhoto()
    } catch (err: any) {
      console.error('Erro ao relatar defeito:', err)
      setSubmitError(err?.message ?? 'Falha ao registrar relato de defeito.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetSuccess = () => {
    setSuccessLog(null)
    loadAssets()
  }

  // ── Renderização ───────────────────────────────────────────────────────────

  // Tela de Sucesso
  if (successLog) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="text-center p-6 border-emerald-100 shadow-card">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-emerald-600">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <CardTitle className="text-2xl text-gray-900 mb-2">Chamado Aberto com Sucesso!</CardTitle>
          <CardDescription className="mb-6">
            O bem patrimonial foi marcado como **Manutenção** e não poderá ser emprestado até que a manutenção seja concluída.
          </CardDescription>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-400">PATRIMÔNIO</span>
              <Badge variant="critical" className="font-bold">
                {successLog.asset?.assetTag}
              </Badge>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400">DESCRIÇÃO DO BEM</span>
              <span className="text-sm font-medium text-gray-900">{successLog.asset?.description}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400">PROBLEMA REPORTADO</span>
              <span className="text-sm font-medium text-gray-900 bg-white p-3 rounded-lg border border-gray-100 block mt-1">
                {successLog.issueDescription}
              </span>
            </div>
            {successLog.defectPhotoUrl && (
              <div>
                <span className="block text-xs font-semibold text-gray-400 mb-1">FOTO DO DEFEITO ANEXADA</span>
                <img
                  src={successLog.defectPhotoUrl}
                  alt="Foto do Defeito"
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() =>
                generateDefectReportPdf({
                  assetTag: successLog.asset?.assetTag ?? '',
                  description: successLog.asset?.description ?? '',
                  brand: successLog.asset?.brand,
                  model: successLog.asset?.model,
                  serialNumber: successLog.asset?.serialNumber,
                  location: successLog.asset?.location,
                  issueDescription: successLog.issueDescription,
                  reportedAt: successLog.reportedAt ?? new Date(),
                  photoDataUrl: successLog.defectPhotoUrl,
                }).catch((err) => console.error('Erro ao gerar PDF:', err))
              }
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
            <Button onClick={handleResetSuccess} className="flex-1">
              Relatar Outro Defeito
            </Button>
          </div>
          <Button onClick={() => navigate('/assets/catalog')} variant="ghost" className="w-full mt-3">
            Voltar ao Catálogo
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Relatar Defeito</h1>
        <p className="text-sm text-gray-500">
          Abra um chamado de manutenção para um item do patrimônio que esteja quebrado, danificado ou precisando de reparos.
        </p>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro ao carregar dados:</span> {fetchError}
          </div>
          <Button size="sm" variant="ghost" onClick={loadAssets} className="text-red-800 hover:bg-red-100 shrink-0">
            Tentar Novamente
          </Button>
        </div>
      )}

      {submitError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Falha ao salvar:</span> {submitError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Section: Form fields */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Detalhes da Avaria</CardTitle>
              <CardDescription>Selecione o patrimônio e relate o problema técnico identificado.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Patrimônio Selector */}
              <div className="space-y-1.5 relative">
                <Label htmlFor="assetSelect">Patrimônio / Ferramenta</Label>
                {selectedAsset ? (
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary mt-0.5">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{selectedAsset.assetTag}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-semibold text-gray-500">
                            {selectedAsset.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium mt-0.5">{selectedAsset.description}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelectedAsset(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <Input
                        id="assetSelect"
                        placeholder={loadingData ? "Buscando patrimônios..." : "Digite o código PAT ou descrição..."}
                        value={assetSearch}
                        onChange={(e) => {
                          setAssetSearch(e.target.value)
                          setShowAssetDropdown(true)
                        }}
                        onFocus={() => setShowAssetDropdown(true)}
                        className="pl-10"
                        disabled={loadingData}
                        autoComplete="off"
                      />
                      {loadingData && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>

                    {showAssetDropdown && (assetSearch || reportableAssets.length > 0) && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowAssetDropdown(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1.5 max-h-60 bg-white border border-gray-100 rounded-xl shadow-dropdown z-20 overflow-y-auto scrollbar-thin">
                          {reportableAssets.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                              Nenhum patrimônio disponível encontrado.
                            </div>
                          ) : (
                            reportableAssets.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => handleSelectAsset(asset)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">{asset.assetTag}</span>
                                    <Badge variant={ASSET_STATUS_BADGE[asset.currentStatus]?.variant ?? 'default'}>
                                      {ASSET_STATUS_BADGE[asset.currentStatus]?.label ?? asset.currentStatus}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium mt-0.5 truncate max-w-md">
                                    {asset.description}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Descrição do Defeito */}
              <div className="space-y-1.5">
                <Label htmlFor="issueDescription">Descrição Detalhada do Defeito</Label>
                <Textarea
                  id="issueDescription"
                  placeholder="Explique o que aconteceu, onde está a falha ou quais são os sintomas do problema no equipamento..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="min-h-32"
                  required
                />
                <span className="text-xs text-gray-400 flex justify-between">
                  <span>Mínimo de 10 caracteres.</span>
                  <span className={cn(issueDescription.trim().length >= 10 ? "text-emerald-600 font-semibold" : "text-gray-400")}>
                    {issueDescription.trim().length} caracteres digitados
                  </span>
                </span>
              </div>

              {/* Anexar Foto do Defeito (Mock) */}
              <div className="space-y-2">
                <Label>Foto do Defeito (Opcional)</Label>
                {photoPreview ? (
                  <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-w-sm">
                    <img
                      src={photoPreview}
                      alt="Preview do Defeito"
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
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Tire ou selecione uma foto</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG ou JPEG (máx. 5MB)</p>
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
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Selected asset summary and submit */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Resumo do Relato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {selectedAsset ? (
                <div className="space-y-4">
                  {/* Informações detalhadas do bem selecionado */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase">
                      <Tag className="w-3.5 h-3.5 text-brand-primary" />
                      Identificação
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">Código de Controle</span>
                      <span className="text-sm font-bold text-gray-900">{selectedAsset.assetTag}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">Equipamento</span>
                      <span className="text-sm font-medium text-gray-900">{selectedAsset.description}</span>
                    </div>
                    {selectedAsset.brand && (
                      <div>
                        <span className="block text-xs font-semibold text-gray-400">Marca / Modelo</span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedAsset.brand} {selectedAsset.model && ` - ${selectedAsset.model}`}
                        </span>
                      </div>
                    )}
                    {selectedAsset.serialNumber && (
                      <div>
                        <span className="block text-xs font-semibold text-gray-400">Nº de Série</span>
                        <span className="text-sm font-mono text-gray-800 text-xs">{selectedAsset.serialNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">Localização Atual</span>
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {selectedAsset.location ?? 'Almoxarifado Central'}
                      </span>
                    </div>
                  </div>

                  {/* Checklist visual de aprovação */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={selectedAsset ? 'text-emerald-500' : 'text-gray-300'}>✓</span>
                      <span>Patrimônio selecionado</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={issueDescription.trim().length >= 10 ? 'text-emerald-500' : 'text-gray-300'}>✓</span>
                      <span>Descrição do problema (mín. 10 caracteres)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-sm">
                  <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  Nenhum patrimônio selecionado. Escolha um item para visualizar as especificações antes do envio.
                </div>
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={!selectedAsset || issueDescription.trim().length < 10 || isSubmitting || isCompressingPhoto}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviando Relato...
                  </>
                ) : isCompressingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processando foto...
                  </>
                ) : (
                  'Abrir Chamado de Avaria'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/assets/catalog')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
