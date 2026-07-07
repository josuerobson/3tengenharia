// src/pages/assets/LoanRequestsPage.tsx
// Página de Solicitações de Empréstimo — Visão do Colaborador.
// Permite solicitar bens por categoria e registrar devoluções com fotos + checklist.

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Plus,
  AlertCircle,
  Loader2,
  Camera,
  X,
  CheckCircle2,
  Clock,
  ArrowLeftRight,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi, type AssetCategory, type AssetLoanRequest, type ApiWorksite } from '@/lib/api'

function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
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
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = reject
    img.src = url
  })
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando Atendimento',
  LOANED: 'Em Uso',
  RETURNING: 'Aguardando Validação',
  RETURNED: 'Devolvido',
  REJECTED: 'Rejeitado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-700 bg-amber-100 border-amber-200',
  LOANED: 'text-blue-700 bg-blue-100 border-blue-200',
  RETURNING: 'text-orange-700 bg-orange-100 border-orange-200',
  RETURNED: 'text-green-700 bg-green-100 border-green-200',
  REJECTED: 'text-red-700 bg-red-100 border-red-200',
}

export default function LoanRequestsPage() {
  useAuth()

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<AssetLoanRequest[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Modal Nova Solicitação ─────────────────────────────────────────────────
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)

  // ── Modal Devolução ────────────────────────────────────────────────────────
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRequestForReturn, setSelectedRequestForReturn] = useState<AssetLoanRequest | null>(null)
  const [returnNotes, setReturnNotes] = useState('')
  const [isWorking, setIsWorking] = useState(true)
  const [hasDamage, setHasDamage] = useState(false)
  const [returnPhotos, setReturnPhotos] = useState<string[]>([])
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)

  // ── Carregar Dados ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [reqData, catData, worksiteData] = await Promise.all([
        assetsApi.listLoanRequests(),
        assetsApi.listCategories(),
        assetsApi.listWorksites(),
      ])
      setRequests(reqData)
      setCategories(catData.filter(c => c.isActive))
      setWorksites(worksiteData)
      if (catData.filter(c => c.isActive).length > 0) {
        setSelectedCategoryId(catData.filter(c => c.isActive)[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao carregar solicitações:', err)
      setError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Handler Nova Solicitação ────────────────────────────────────────────────
  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategoryId) {
      setNewError('Selecione a categoria do bem que precisa.')
      return
    }

    setNewSubmitting(true)
    setNewError(null)

    try {
      await assetsApi.createLoanRequest({
        categoryId: selectedCategoryId,
        destinationWorksiteId: selectedWorksiteId || null,
        requestNotes: requestNotes.trim() || null,
      })
      setNewModalOpen(false)
      setRequestNotes('')
      setSelectedWorksiteId('')
      loadData()
    } catch (err: any) {
      console.error('Erro ao criar solicitação:', err)
      setNewError(err?.message ?? 'Ocorreu um erro ao criar a solicitação.')
    } finally {
      setNewSubmitting(false)
    }
  }

  // ── Handlers de Devolução ──────────────────────────────────────────────────
  const handleOpenReturnModal = (req: AssetLoanRequest) => {
    setSelectedRequestForReturn(req)
    setReturnNotes('')
    setIsWorking(true)
    setHasDamage(false)
    setReturnPhotos([])
    setReturnError(null)
    setReturnModalOpen(true)
  }

  const handleReturnPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const base64Photos: string[] = []
    for (let i = 0; i < files.length; i++) {
      if (base64Photos.length + returnPhotos.length >= 4) break
      try {
        const compressed = await compressImage(files[i], 800, 800, 0.6)
        base64Photos.push(compressed)
      } catch (err) {
        console.error('Erro ao comprimir foto:', err)
      }
    }
    setReturnPhotos((prev) => [...prev, ...base64Photos].slice(0, 4))
  }

  const handleRemoveReturnPhoto = (idx: number) => {
    setReturnPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequestForReturn) return
    if (returnPhotos.length === 0) {
      setReturnError('Adicione pelo menos uma foto do equipamento na devolução.')
      return
    }

    setReturnSubmitting(true)
    setReturnError(null)

    try {
      await assetsApi.submitReturn(selectedRequestForReturn.id, {
        returnPhoto1: returnPhotos[0],
        returnPhoto2: returnPhotos[1] ?? null,
        returnPhoto3: returnPhotos[2] ?? null,
        returnPhoto4: returnPhotos[3] ?? null,
        returnNotes: returnNotes.trim() || null,
        isWorking,
        hasDamage,
      })
      setReturnModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao registrar devolução:', err)
      setReturnError(err?.message ?? 'Ocorreu um erro ao registrar a devolução.')
    } finally {
      setReturnSubmitting(false)
    }
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const activeRequests = requests.filter(r => ['PENDING', 'LOANED', 'RETURNING'].includes(r.status))
  const closedRequests = requests.filter(r => ['RETURNED', 'REJECTED'].includes(r.status))

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-brand-primary w-7 h-7" />
            Minhas Solicitações
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Solicite equipamentos e acompanhe o status dos seus empréstimos.
          </p>
        </div>
        <Button onClick={() => setNewModalOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-800">{error}</p>
            <Button size="sm" variant="ghost" onClick={loadData} className="text-red-800 hover:bg-red-100 mt-1 h-7">
              Recarregar
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          <p className="text-sm text-gray-500 font-medium">Buscando suas solicitações...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ativos */}
          {activeRequests.length === 0 && closedRequests.length === 0 ? (
            <div className="py-16 text-center bg-white border border-gray-100 rounded-2xl">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-500">Nenhuma solicitação ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Clique em "Nova Solicitação" para começar.</p>
            </div>
          ) : (
            <>
              {/* Seção Ativas */}
              {activeRequests.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Em andamento ({activeRequests.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {activeRequests.map((req) => (
                      <Card key={req.id} className="p-4 sm:p-5 border-gray-100 bg-white shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[req.status] ?? 'text-gray-600 bg-gray-100'}`}>
                                {req.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                                {req.status === 'LOANED' && <Package className="w-3 h-3 mr-1" />}
                                {req.status === 'RETURNING' && <ArrowLeftRight className="w-3 h-3 mr-1" />}
                                {STATUS_LABELS[req.status] ?? req.status}
                              </span>
                            </div>
                            <p className="text-base font-bold text-gray-900 mt-2">{req.category?.name}</p>
                            {req.allocatedAsset && (
                              <p className="text-sm text-gray-600 mt-0.5 font-medium">
                                Bem alocado: <span className="text-gray-800">{req.allocatedAsset.assetTag} — {req.allocatedAsset.description}</span>
                              </p>
                            )}
                            {req.destinationWorksite && (
                              <p className="text-xs text-gray-500 mt-1">
                                Obra: {req.destinationWorksite.name}
                              </p>
                            )}
                            {req.requestNotes && (
                              <p className="text-xs text-gray-400 mt-1 italic">"{req.requestNotes}"</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Solicitado em {new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Fotos de envio (quando LOANED ou RETURNING) */}
                        {req.status !== 'PENDING' && req.checkoutPhoto1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 mb-2">Fotos no envio:</p>
                            <div className="flex gap-2 flex-wrap">
                              {[req.checkoutPhoto1, req.checkoutPhoto2, req.checkoutPhoto3, req.checkoutPhoto4].filter(Boolean).map((photo, idx) => (
                                <img key={idx} src={photo!} alt="Foto de envio" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                              ))}
                            </div>
                            {req.checkoutNotes && (
                              <p className="text-xs text-gray-400 mt-1.5 italic">"{req.checkoutNotes}"</p>
                            )}
                          </div>
                        )}

                        {/* Botão de devolver (só aparece quando LOANED) */}
                        {req.status === 'LOANED' && (
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReturnModal(req)}
                              className="flex items-center gap-1.5 text-xs font-semibold border-brand-primary text-brand-primary hover:bg-brand-primary/5 h-9"
                            >
                              <ArrowLeftRight size={13} />
                              Registrar Devolução
                            </Button>
                          </div>
                        )}

                        {/* Aguardando validação do gestor */}
                        {req.status === 'RETURNING' && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-orange-700 font-semibold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Devolução registrada. Aguardando confirmação do gestor.
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção Histórico */}
              {closedRequests.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Histórico ({closedRequests.length})
                  </h2>
                  <div className="divide-y divide-gray-100 bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    {closedRequests.map((req) => (
                      <div key={req.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{req.category?.name}</p>
                          {req.allocatedAsset && (
                            <p className="text-xs text-gray-500 truncate">{req.allocatedAsset.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLORS[req.status] ?? 'text-gray-600 bg-gray-100'}`}>
                          {req.status === 'RETURNED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal Nova Solicitação ───────────────────────────────────────────── */}
      <Dialog
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Nova Solicitação de Equipamento"
        description="Informe o tipo de equipamento que precisa. O gestor do almoxarifado irá alocar um bem disponível."
      >
        <form onSubmit={handleNewRequest} className="space-y-4 pt-2">
          {newError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold">{newError}</p>
            </div>
          )}

          <div>
            <Label htmlFor="reqCategory" required>Tipo de Equipamento</Label>
            <select
              id="reqCategory"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="reqWorksite">Obra de Destino (opcional)</Label>
            <select
              id="reqWorksite"
              value={selectedWorksiteId}
              onChange={(e) => setSelectedWorksiteId(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
            >
              <option value="">Nenhuma / Almoxarifado</option>
              {worksites.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.code} — {ws.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="reqNotes">Observações (opcional)</Label>
            <Textarea
              id="reqNotes"
              placeholder="Ex: Preciso de uma furadeira para instalação de divisórias. Necessário com broca de 10mm."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="min-h-[80px] mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)} disabled={newSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={newSubmitting}>
              {newSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal Devolução ──────────────────────────────────────────────────── */}
      <Dialog
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Registrar Devolução"
        description={`Registre a devolução do equipamento: ${selectedRequestForReturn?.allocatedAsset?.description ?? selectedRequestForReturn?.category?.name}`}
      >
        <form onSubmit={handleSubmitReturn} className="space-y-4 pt-2">
          {returnError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold">{returnError}</p>
            </div>
          )}

          {/* Checklist */}
          <div>
            <Label>Checklist de Estado do Equipamento</Label>
            <div className="space-y-2 mt-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isWorking ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={isWorking}
                  onChange={(e) => setIsWorking(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">Está funcionando</span>
                  <p className="text-xs text-gray-500">O equipamento está em plenas condições de uso.</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${hasDamage ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={hasDamage}
                  onChange={(e) => setHasDamage(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">Teve alguma avaria</span>
                  <p className="text-xs text-gray-500">Houve alguma avaria, desgaste excessivo ou dano visível.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Fotos Obrigatórias */}
          <div>
            <Label required>Fotos do Equipamento (mínimo 1, até 4)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {returnPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveReturnPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {returnPhotos.length < 4 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-400">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleReturnPhotoChange}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Fotografe todos os lados do equipamento antes de devolver.</p>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="returnNotes">Observações (opcional)</Label>
            <Textarea
              id="returnNotes"
              placeholder="Ex: Lâmina da serra desgastada após uso intenso. Precisa de substituição."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="min-h-[70px] mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setReturnModalOpen(false)} disabled={returnSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={returnSubmitting}>
              {returnSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Registrando...</>
              ) : (
                'Confirmar Devolução'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
