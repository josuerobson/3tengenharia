import { useState, useCallback, useRef } from 'react'
import { X, Fuel, Camera, Trash2, Gauge } from 'lucide-react'
import { tripsApi } from '@/lib/api'

interface FuelRecordModalProps {
  tripId: string
  vehiclePlate: string
  vehicleModel: string
  onClose: () => void
  onSuccess: () => void
}

/** Comprime uma única foto via Canvas e retorna o base64 (mesmo padrão do IncidentReportModal). */
function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo selecionado não é uma imagem.'))
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1024

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
      img.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

interface PhotoSlotProps {
  label: string
  photo: string | null
  onPick: (file: File) => void
  onRemove: () => void
}

function PhotoSlot({ label, photo, onPick, onRemove }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      {photo ? (
        <div className="relative h-32 rounded-xl overflow-hidden border border-gray-150 group">
          <img src={photo} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-white"
          >
            <Trash2 size={18} />
            <span className="ml-1.5 text-xs font-bold">Tirar Outra</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
        >
          <Camera size={22} />
          <span className="text-[10px] font-bold mt-1.5">Tirar Foto</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
        className="hidden"
      />
    </div>
  )
}

export default function FuelRecordModal({
  tripId,
  vehiclePlate,
  vehicleModel,
  onClose,
  onSuccess,
}: FuelRecordModalProps) {
  const [odometerKm, setOdometerKm] = useState('')
  const [liters, setLiters] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null)
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePhotoError = useCallback((err: unknown) => {
    setErrorMsg(err instanceof Error ? err.message : 'Falha ao processar a foto.')
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const kmValue = parseInt(odometerKm, 10)
    const litersValue = parseFloat(liters.replace(',', '.'))
    const totalValue = parseFloat(totalAmount.replace(',', '.'))

    if (!odometerKm || isNaN(kmValue) || kmValue < 0) {
      setErrorMsg('Informe a quilometragem atual do veículo.')
      return
    }
    if (!liters || isNaN(litersValue) || litersValue <= 0) {
      setErrorMsg('Informe a quantidade de litros abastecidos.')
      return
    }
    if (!totalAmount || isNaN(totalValue) || totalValue <= 0) {
      setErrorMsg('Informe o valor total abastecido.')
      return
    }
    if (!odometerPhoto) {
      setErrorMsg('A foto do hodômetro é obrigatória.')
      return
    }
    if (!receiptPhoto) {
      setErrorMsg('A foto do cupom de abastecimento é obrigatória.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await tripsApi.createFuelRecord(tripId, {
        odometerKm: kmValue,
        liters: litersValue,
        totalAmount: totalValue,
        odometerPhoto,
        receiptPhoto,
      })
      onSuccess()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao registrar abastecimento.')
    } finally {
      setIsSubmitting(false)
    }
  }, [tripId, odometerKm, liters, totalAmount, odometerPhoto, receiptPhoto, onSuccess])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-gray-100 shadow-2xl animate-scale-in">

        {/* Cabeçalho */}
        <div className="bg-emerald-50 px-6 py-4 flex items-center justify-between border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <Fuel size={20} />
            <div>
              <h3 className="text-base font-bold">Registro de Abastecimento</h3>
              <p className="text-xs text-emerald-700/80 font-medium">Veículo: {vehiclePlate} — {vehicleModel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors outline-none"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex gap-2 text-xs text-red-650 font-semibold">
              <span className="flex-shrink-0">⚠</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Campo: KM Atual */}
          <div>
            <label htmlFor="fuel-odometer-km" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Quilometragem Atual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="fuel-odometer-km"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 48320"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                required
              />
              <Gauge size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Campos: Litros e Valor Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fuel-liters" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Litros <span className="text-red-500">*</span>
              </label>
              <input
                id="fuel-liters"
                type="number"
                step="0.001"
                min="0"
                placeholder="Ex: 45.5"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="fuel-total-amount" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Valor Total (R$) <span className="text-red-500">*</span>
              </label>
              <input
                id="fuel-total-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 285.90"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Campos: Fotos */}
          <div className="grid grid-cols-2 gap-3">
            <PhotoSlot
              label="Foto do Hodômetro"
              photo={odometerPhoto}
              onPick={(file) => compressPhoto(file).then(setOdometerPhoto).catch(handlePhotoError)}
              onRemove={() => setOdometerPhoto(null)}
            />
            <PhotoSlot
              label="Cupom + Cartão Combustível"
              photo={receiptPhoto}
              onPick={(file) => compressPhoto(file).then(setReceiptPhoto).catch(handlePhotoError)}
              onRemove={() => setReceiptPhoto(null)}
            />
          </div>

          {/* Rodapé e Ações */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-11 border border-gray-200 text-gray-650 hover:bg-gray-50 rounded-xl font-semibold text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Abastecimento'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
