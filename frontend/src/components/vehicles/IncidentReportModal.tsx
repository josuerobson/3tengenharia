import { useState, useCallback, useRef, useEffect } from 'react'
import { X, AlertTriangle, MapPin, Camera, Trash2 } from 'lucide-react'
import { tripsApi } from '@/lib/api'

interface IncidentReportModalProps {
  tripId: string
  vehiclePlate: string
  vehicleModel: string
  onClose: () => void
  onSuccess: () => void
}

// Auxiliar de geolocalização rápido (alta ou baixa precisão)
function getCurrentCoordinates(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      },
      (error) => {
        console.warn('Erro ao obter geolocalização para sinistro:', error.message)
        // Fallback baixa precisão
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    )
  })
}

export default function IncidentReportModal({
  tripId,
  vehiclePlate,
  vehicleModel,
  onClose,
  onSuccess,
}: IncidentReportModalProps) {
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tratamento e compressão de imagens via Canvas
  const handlePhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return

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
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
            setPhotos((prev) => [...prev, compressedBase64])
          }
        };
        img.src = event.target?.result as string
      };
      reader.readAsDataURL(file)
    });

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleFetchLocation = useCallback(async () => {
    setIsGettingLocation(true)
    setErrorMsg(null)
    try {
      const coords = await getCurrentCoordinates()
      if (coords) {
        setLocation(coords)
      } else {
        setErrorMsg('Não foi possível obter a geolocalização automaticamente.')
      }
    } catch {
      setErrorMsg('Falha ao acessar o sensor de GPS.')
    } finally {
      setIsGettingLocation(false)
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || description.length < 10) {
      setErrorMsg('A descrição do sinistro deve ter pelo menos 10 caracteres.')
      return
    }
    if (!location.trim()) {
      setErrorMsg('O local ou coordenadas do sinistro são obrigatórios.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await tripsApi.createIncident(tripId, {
        description: description.trim(),
        location: location.trim(),
        photos,
      })
      onSuccess()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao registrar sinistro.')
    } finally {
      setIsSubmitting(false)
    }
  }, [tripId, description, location, photos, onSuccess])

  // Limpeza preventiva
  useEffect(() => {
    return () => {
      setPhotos([])
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-gray-100 shadow-2xl animate-scale-in">
        
        {/* Cabeçalho */}
        <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={20} className="animate-pulse" />
            <div>
              <h3 className="text-base font-bold">Registrar Sinistro / Ocorrência</h3>
              <p className="text-xs text-red-650 font-medium">Veículo: {vehiclePlate} — {vehicleModel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-700 transition-colors outline-none"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          
          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex gap-2 text-xs text-red-650 font-semibold">
              <span className="flex-shrink-0">⚠</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Campo: Local da Ocorrência */}
          <div>
            <label htmlFor="incident-location" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Local da Ocorrência <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <input
                  id="incident-location"
                  type="text"
                  placeholder="Endereço, rodovia, KM ou coordenadas"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  required
                />
                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
              </div>
              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={isGettingLocation}
                className="px-3.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 active:scale-95 disabled:opacity-50 transition-all text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
              >
                {isGettingLocation ? 'Buscando...' : 'Obter GPS'}
              </button>
            </div>
          </div>

          {/* Campo: Descrição */}
          <div>
            <label htmlFor="incident-desc" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Descrição da Ocorrência <span className="text-red-500">*</span>
            </label>
            <textarea
              id="incident-desc"
              rows={3}
              placeholder="Descreva detalhadamente o ocorrido (avarias, colisões, pneu furado, panes, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">Mínimo de 10 caracteres.</p>
          </div>

          {/* Campo: Fotos */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Fotos da Ocorrência
            </label>
            
            <div className="grid grid-cols-4 gap-2">
              {/* Botão de captura */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-400 flex flex-col items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              >
                <Camera size={20} />
                <span className="text-[9px] font-bold mt-1">Tirar Foto</span>
              </button>
              
              {/* Preview das fotos */}
              {photos.map((base64, idx) => (
                <div key={idx} className="relative h-16 rounded-xl border border-gray-150 overflow-hidden group">
                  <img src={base64} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoAdd}
              className="hidden"
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
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Sinistro'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
