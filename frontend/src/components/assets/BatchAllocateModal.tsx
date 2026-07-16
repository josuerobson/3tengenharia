// src/components/assets/BatchAllocateModal.tsx
// Modal de alocação para um pedido com múltiplos itens/quantidades (mesmo batchId).
// O gestor vincula um bem físico + fotos + notas para CADA unidade em uma única tela
// e envia tudo de uma vez — cada unidade continua sendo uma AssetLoanRequest própria
// (a devolução de cada bem permanece unitária).

import { useMemo, useState } from 'react'
import { Camera, X, AlertCircle, Loader2, Package } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { assetsApi, type AssetLoanRequest } from '@/lib/api'
import { type Asset } from '@/data/mockData'

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
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

interface RowState {
  assetId: string
  photos: string[]
  notes: string
}

interface BatchAllocateModalProps {
  /** Todas as solicitações PENDING que compartilham o mesmo batchId. */
  requests: AssetLoanRequest[]
  assets: Asset[]
  onClose: () => void
  onSuccess: () => void
}

export default function BatchAllocateModal({ requests, assets, onClose, onSuccess }: BatchAllocateModalProps) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(requests.map((r) => [r.id, { assetId: '', photos: [], notes: '' }])),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestsByCategory = useMemo(() => {
    const map = new Map<string, AssetLoanRequest[]>()
    for (const req of requests) {
      const key = req.categoryId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(req)
    }
    return Array.from(map.values())
  }, [requests])

  const availableAssetsForRow = (requestId: string) => {
    const request = requests.find((r) => r.id === requestId)
    const assetIdsUsedElsewhere = new Set(
      Object.entries(rows)
        .filter(([id]) => id !== requestId)
        .map(([, row]) => row.assetId)
        .filter(Boolean),
    )
    return assets.filter(
      (a) =>
        a.currentStatus === 'AVAILABLE' &&
        a.categoryId === request?.categoryId &&
        !assetIdsUsedElsewhere.has(a.id),
    )
  }

  const handleAssetChange = (requestId: string, assetId: string) => {
    setRows((prev) => ({ ...prev, [requestId]: { ...prev[requestId], assetId } }))
  }

  const handleNotesChange = (requestId: string, notes: string) => {
    setRows((prev) => ({ ...prev, [requestId]: { ...prev[requestId], notes } }))
  }

  const handlePhotoAdd = async (requestId: string, files: FileList | null) => {
    if (!files) return
    const current = rows[requestId]?.photos ?? []
    const newPhotos: string[] = []
    for (let i = 0; i < files.length; i++) {
      if (newPhotos.length + current.length >= 4) break
      try {
        newPhotos.push(await compressImage(files[i], 800, 800, 0.6))
      } catch (err) {
        console.error('Erro ao comprimir foto:', err)
      }
    }
    setRows((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], photos: [...current, ...newPhotos].slice(0, 4) },
    }))
  }

  const handleRemovePhoto = (requestId: string, idx: number) => {
    setRows((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], photos: prev[requestId].photos.filter((_, i) => i !== idx) },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const missing = requests.some((r) => !rows[r.id]?.assetId)
    if (missing) {
      setError('Selecione um bem físico para cada item do pedido.')
      return
    }
    const assetIds = requests.map((r) => rows[r.id].assetId)
    if (new Set(assetIds).size !== assetIds.length) {
      setError('Não é possível vincular o mesmo bem físico a mais de um item.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await assetsApi.allocateLoanRequestBatch({
        allocations: requests.map((r) => ({
          requestId: r.id,
          allocatedAssetId: rows[r.id].assetId,
          checkoutPhoto1: rows[r.id].photos[0] ?? null,
          checkoutPhoto2: rows[r.id].photos[1] ?? null,
          checkoutPhoto3: rows[r.id].photos[2] ?? null,
          checkoutPhoto4: rows[r.id].photos[3] ?? null,
          checkoutNotes: rows[r.id].notes.trim() || null,
        })),
      })
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao alocar pedido em lote:', err)
      setError(err?.message ?? 'Ocorreu um erro ao enviar os itens.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requesterName = requests[0]?.requesterEmployee?.fullName ?? '—'

  return (
    <Dialog
      open
      onClose={onClose}
      title="Alocar Bens e Enviar Pedido"
      description={`Vincule um bem físico para cada item solicitado por: ${requesterName}`}
      maxWidth="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        <div className="space-y-5 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
          {requestsByCategory.map((group) => (
            <div key={group[0].categoryId} className="space-y-3">
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {group[0].category?.name} — {group.length} unidade{group.length > 1 ? 's' : ''}
              </p>

              {group.map((req, idx) => {
                const row = rows[req.id]
                return (
                  <div key={req.id} className="p-3.5 bg-white border border-gray-150 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Unidade {idx + 1} de {group.length}
                    </p>

                    <div>
                      <Label htmlFor={`asset-${req.id}`} required>Bem Físico a Enviar</Label>
                      <select
                        id={`asset-${req.id}`}
                        value={row.assetId}
                        onChange={(e) => handleAssetChange(req.id, e.target.value)}
                        className="mt-1.5 w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
                        required
                      >
                        <option value="">Selecione um bem disponível...</option>
                        {availableAssetsForRow(req.id).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.assetTag} — {a.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Fotos do Estado de Envio (até 4)</Label>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {row.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                            <img src={photo} alt={`Foto ${pIdx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(req.id, pIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        {row.photos.length < 4 && (
                          <label className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <Camera className="w-4 h-4 text-gray-400 mb-0.5" />
                            <span className="text-[9px] text-gray-400">Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoAdd(req.id, e.target.files)}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`notes-${req.id}`}>Observações (opcional)</Label>
                      <Textarea
                        id={`notes-${req.id}`}
                        placeholder="Ex: Equipamento em perfeito estado, com acessórios originais."
                        value={row.notes}
                        onChange={(e) => handleNotesChange(req.id, e.target.value)}
                        className="min-h-[60px] mt-1.5 text-sm"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando {requests.length} itens...</>
            ) : (
              `Concluir e Enviar Todos (${requests.length})`
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
