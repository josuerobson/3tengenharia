// src/pages/fiveS/DailyAuditForm5S.tsx
// Tela de Registro de Auditoria 5S — Mobile-First.
// Preencher no campo pelo supervisor/encarregado ao final da inspeção.

import { useState, useRef, useCallback, useEffect, type ChangeEvent } from 'react'
import {
  Building2,
  MapPin,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Search,
  Send,
  Loader2,
  RotateCcw,
  ImagePlus,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  type AuditStatus5S,
} from '@/data/mockData'
import { assetsApi, fiveSApi, type ApiWorksite } from '@/lib/api'

type Worksite = ApiWorksite

// ── Funções Auxiliares ─────────────────────────────────────────────────────────

function compressImage(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> {
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

        // Redimensionar mantendo proporção
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
          resolve(event.target?.result as string) // Fallback para base64 original se canvas falhar
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        // Converte para jpeg comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface PhotoPreview {
  id: string
  objectUrl: string
  fileName: string
  sizeKb: number
  file?: File
}

type PageState = 'FORM' | 'SUBMITTING' | 'SUCCESS'

// ── Combobox de Obras (reutiliza o padrão do DailyLogPage) ───────────────────

interface WorksiteComboboxProps {
  worksites: Worksite[]
  value: Worksite | null
  onChange: (w: Worksite | null) => void
  error?: string
}

function WorksiteCombobox({ worksites, value, onChange, error }: WorksiteComboboxProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = worksites.filter(
    (w) =>
      w.name.toLowerCase().includes(q.toLowerCase()) ||
      w.code.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setTimeout(() => inputRef.current?.focus(), 60) }}
        className={cn(
          'flex items-center justify-between w-full h-14 px-4 rounded-2xl border bg-white text-sm',
          'transition-all duration-150 focus-visible:outline-none',
          open ? 'border-brand-primary ring-2 ring-brand-primary/20'
               : error ? 'border-red-400' : 'border-gray-200 hover:border-brand-primary/50',
        )}
      >
        {value ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={17} className="text-brand-primary" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{value.name}</p>
              <p className="text-xs text-gray-400 truncate">{value.code} · {value.city || 'Obra'}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 flex items-center gap-2">
            <Building2 size={16} />
            Selecione a obra auditada...
          </span>
        )}
        <ChevronDown size={16} className={cn('text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {error}</p>}

      {open && (
        <div className="absolute inset-x-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-slide-down">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar obra..." className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin py-1">
            {filtered.map((w) => (
              <button key={w.id} type="button"
                onClick={() => { onChange(w); setOpen(false); setQ('') }}
                className={cn('flex items-center gap-3 w-full px-3 py-3 text-left transition-colors',
                  value?.id === w.id ? 'bg-brand-primary/8 text-brand-primary' : 'hover:bg-gray-50')}>
                <Building2 size={14} className={value?.id === w.id ? 'text-brand-primary' : 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.code} · {w.city || 'Obra'}</p>
                </div>
                {value?.id === w.id && <CheckCircle2 size={14} className="text-brand-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Toggle de Status 5S (CONFORME / NAO_CONFORME) ────────────────────────────

interface StatusToggleProps {
  value: AuditStatus5S | null
  onChange: (v: AuditStatus5S) => void
  error?: string
}

function StatusToggle({ value, onChange, error }: StatusToggleProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {/* CONFORME */}
        <button
          type="button"
          onClick={() => onChange('CONFORME')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2',
            'transition-all duration-150 active:scale-[0.97]',
            value === 'CONFORME'
              ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100'
              : 'bg-white border-gray-200 hover:border-emerald-300',
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            value === 'CONFORME' ? 'bg-emerald-500' : 'bg-gray-100',
          )}>
            <CheckCircle2 size={22} className={value === 'CONFORME' ? 'text-white' : 'text-gray-400'} />
          </div>
          <span className={cn('text-sm font-bold', value === 'CONFORME' ? 'text-emerald-700' : 'text-gray-500')}>
            Conforme
          </span>
        </button>

        {/* NAO_CONFORME */}
        <button
          type="button"
          onClick={() => onChange('NAO_CONFORME')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2',
            'transition-all duration-150 active:scale-[0.97]',
            value === 'NAO_CONFORME'
              ? 'bg-red-50 border-red-500 shadow-md shadow-red-100'
              : 'bg-white border-gray-200 hover:border-red-300',
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            value === 'NAO_CONFORME' ? 'bg-red-500' : 'bg-gray-100',
          )}>
            <AlertTriangle size={22} className={value === 'NAO_CONFORME' ? 'text-white' : 'text-gray-400'} />
          </div>
          <span className={cn('text-sm font-bold', value === 'NAO_CONFORME' ? 'text-red-700' : 'text-gray-500')}>
            Não Conforme
          </span>
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {error}</p>}
    </div>
  )
}

// ── Thumbnail de Preview de Foto ──────────────────────────────────────────────

function PhotoThumb({ photo, onRemove }: { photo: PhotoPreview; onRemove: () => void }) {
  return (
    <div className="relative group aspect-square">
      <img
        src={photo.objectUrl}
        alt={photo.fileName}
        className="w-full h-full object-cover rounded-xl border-2 border-gray-100"
        loading="lazy"
      />
      {/* Overlay escuro no hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors" />
      {/* Botão remover */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full
                   flex items-center justify-center shadow-lg
                   opacity-0 group-hover:opacity-100 sm:opacity-100
                   transition-opacity duration-150 hover:bg-red-600"
        aria-label={`Remover foto ${photo.fileName}`}
      >
        <X size={12} strokeWidth={3} />
      </button>
      {/* Tamanho */}
      <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/50 rounded px-1 font-medium">
        {photo.sizeKb}kb
      </span>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function DailyAuditForm5S() {
  const [worksitesList, setWorksitesList] = useState<Worksite[]>([])
  const [areaTypesList, setAreaTypesList] = useState<string[]>(['Canteiro', 'Almoxarifado', 'Escritório', 'Área Comum'])
  const [isAddingNewArea, setIsAddingNewArea] = useState(false)
  const [newAreaInput, setNewAreaInput] = useState('')

  const [worksite, setWorksite]     = useState<Worksite | null>(null)
  const [areaType, setAreaType]     = useState<string>('')
  const [status, setStatus]         = useState<AuditStatus5S | null>(null)
  const [description, setDescription] = useState('')
  const [photos, setPhotos]         = useState<PhotoPreview[]>([])
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [pageState, setPageState]   = useState<PageState>('FORM')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isNaoConforme = status === 'NAO_CONFORME'
  const descTooShort  = isNaoConforme && description.trim().length > 0 && description.trim().length < 20
  const descCharCount = description.trim().length

  // Carregar obras e tipos de áreas existentes
  useEffect(() => {
    async function fetchData() {
      // 1. Carrega as obras (obrigatório)
      try {
        const list = await assetsApi.listWorksites()
        setWorksitesList(list)
      } catch (err) {
        console.error('Erro ao carregar obras:', err)
      }

      // 2. Carrega as auditorias (opcional - falha silenciosamente se for colaborador sem permissão)
      try {
        const resAudits = await fiveSApi.list({ limit: 100 })
        const uniqueTypes = Array.from(new Set([
          'Canteiro',
          'Almoxarifado',
          'Escritório',
          'Área Comum',
          ...resAudits.audits.map((a: any) => a.areaType).filter(Boolean)
        ]))
        setAreaTypesList(uniqueTypes)
      } catch (err) {
        console.log('Não foi possível carregar tipos de áreas extras:', err)
      }
    }
    void fetchData()
  }, [])

  // ── Fotos ─────────────────────────────────────────────────────────────────
  const handleFilesChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newPreviews: PhotoPreview[] = files.map((f) => ({
      id:        crypto.randomUUID(),
      objectUrl: URL.createObjectURL(f),
      fileName:  f.name,
      sizeKb:    Math.round(f.size / 1024),
      file:      f,
    }))
    setPhotos((prev) => [...prev, ...newPreviews].slice(0, 10)) // máx 10 fotos
    // Reset input para permitir selecionar os mesmos arquivos novamente
    e.target.value = ''
  }, [])

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const ph = prev.find((p) => p.id === id)
      if (ph) URL.revokeObjectURL(ph.objectUrl)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  // ── Validação e Submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const errs: Record<string, string> = {}
    if (!worksite)   errs.worksite  = 'Selecione a obra auditada.'
    if (!areaType)   errs.areaType  = 'Selecione o tipo de área.'
    if (!status)     errs.status    = 'Indique se a área está conforme ou não.'
    if (photos.length === 0) errs.photos = 'Pelo menos 1 foto é obrigatória.'

    if (isNaoConforme) {
      if (!description.trim())
        errs.description = 'A descrição da irregularidade é obrigatória para Não Conformidades.'
      else if (description.trim().length < 20)
        errs.description = 'Descreva com pelo menos 20 caracteres a irregularidade encontrada.'
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0 || !worksite || !status) return

    try {
      setPageState('SUBMITTING')
      
      // Comprimir fotos locais para Base64 leve e rápido
      const realPhotoUrls = await Promise.all(
        photos.map(async (p) => {
          if (p.file) {
            try {
              return await compressImage(p.file)
            } catch (err) {
              console.error('Erro ao comprimir imagem, usando base64 bruto:', err)
              return new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(p.file!)
              })
            }
          }
          return p.objectUrl
        })
      )

      await fiveSApi.create({
        worksiteId: worksite.id,
        areaType,
        status,
        description: description.trim() || undefined,
        photoUrls: realPhotoUrls,
      })

      setPageState('SUCCESS')
    } catch (err: any) {
      console.error('Erro ao salvar auditoria:', err)
      setErrors((prev) => ({
        ...prev,
        submit: err?.message ?? 'Falha ao salvar auditoria. Tente novamente.',
      }))
      setPageState('FORM')
    }
  }, [worksite, areaType, status, description, photos, isNaoConforme])

  const handleReset = useCallback(() => {
    photos.forEach((p) => URL.revokeObjectURL(p.objectUrl))
    setWorksite(null); setAreaType(''); setStatus(null)
    setDescription(''); setPhotos([]); setErrors({})
    setIsAddingNewArea(false); setNewAreaInput('')
    setPageState('FORM')
  }, [photos])

  // ── Tela de Sucesso ───────────────────────────────────────────────────────
  if (pageState === 'SUCCESS') {
    return (
      <div className="max-w-md mx-auto pt-4 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5',
            status === 'NAO_CONFORME' ? 'bg-red-100' : 'bg-emerald-100',
          )}>
            {status === 'NAO_CONFORME'
              ? <AlertTriangle size={36} className="text-red-500" />
              : <CheckCircle2 size={36} className="text-emerald-500" />}
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Auditoria Registrada!</h2>
          <p className="text-gray-500 text-sm mb-6">
            {status === 'NAO_CONFORME'
              ? 'Não conformidade enviada ao Setor de Qualidade para avaliação.'
              : 'Conformidade registrada com sucesso.'}
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 mb-6">
            <Row icon={Building2} label="Obra"   value={worksite?.name ?? ''} />
            <Row icon={MapPin}    label="Área"   value={areaType} />
            <Row icon={Camera}    label="Fotos"  value={`${photos.length} foto(s) enviada(s)`} />
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" variant="accent" className="w-full" onClick={handleReset}>
              <RotateCcw size={16} /> Nova Auditoria
            </Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => window.location.assign('/5s/panel')}>
              Ver Painel de Qualidade
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Auditoria 5S</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registro de conformidade de área</p>
      </div>

      {/* ── 1. Obra ────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Building2 size={15} className="text-brand-primary" /> Local da Auditoria
        </h2>
        <div>
          <Label required>Obra / Centro de Custo</Label>
          <WorksiteCombobox worksites={worksitesList} value={worksite} onChange={setWorksite} error={errors.worksite} />
        </div>
        <div>
          <Label htmlFor="area-type" required>Tipo de Área</Label>
          {isAddingNewArea ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="area-type-new"
                  type="text"
                  placeholder="Digite o nome da nova área..."
                  value={newAreaInput}
                  onChange={(e) => {
                    setNewAreaInput(e.target.value)
                    setAreaType(e.target.value)
                  }}
                  className={cn(
                    'flex h-14 w-full rounded-2xl border bg-white px-4 text-sm font-semibold',
                    'text-gray-900 focus:outline-none transition-all',
                    errors.areaType
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewArea(false)
                  setAreaType('')
                }}
                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 mt-1.5"
              >
                ← Escolher área existente
              </button>
            </div>
          ) : (
            <div className="relative">
              <select
                id="area-type"
                value={areaType}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '__NEW__') {
                    setIsAddingNewArea(true)
                    setNewAreaInput('')
                    setAreaType('')
                  } else {
                    setAreaType(val)
                  }
                }}
                className={cn(
                  'flex h-14 w-full rounded-2xl border bg-white px-4 text-sm font-semibold',
                  'text-gray-900 focus:outline-none transition-all appearance-none',
                  errors.areaType
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-gray-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
                )}
              >
                <option value="">Selecione o tipo de área...</option>
                {areaTypesList.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="__NEW__" className="text-brand-primary font-bold">+ Adicionar novo tipo de área...</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          {errors.areaType && <p className="mt-1.5 text-xs text-red-500 font-medium">⚠ {errors.areaType}</p>}
        </div>
      </section>

      {/* ── 2. Status ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Resultado da Inspeção</h2>
        <StatusToggle value={status} onChange={setStatus} error={errors.status} />
      </section>

      {/* ── 3. Descrição (condicional) ─────────────────────────────────── */}
      <section className={cn(
        'rounded-2xl border shadow-card p-4 space-y-3 transition-all duration-200',
        isNaoConforme ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100',
      )}>
        <h2 className={cn('text-sm font-bold flex items-center gap-2', isNaoConforme ? 'text-red-800' : 'text-gray-700')}>
          <AlertTriangle size={15} className={isNaoConforme ? 'text-red-500' : 'text-gray-400'} />
          Descrição da Irregularidade
          {isNaoConforme && <span className="text-red-500">*</span>}
        </h2>

        {!isNaoConforme && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Info size={11} />
            Opcional para áreas conformes. Selecione "Não Conforme" para habilitar o campo obrigatório.
          </p>
        )}

        <div>
          <textarea
            id="description"
            rows={isNaoConforme ? 5 : 3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isNaoConforme
              ? 'Descreva detalhadamente a irregularidade encontrada...\n\nEx: Materiais empilhados sem cinto de segurança nas bordas, próximo à circulação.'
              : 'Observação opcional sobre a área auditada...'}
            className={cn(
              'flex w-full rounded-xl border px-4 py-3 text-sm resize-none',
              'focus:outline-none transition-all duration-150',
              isNaoConforme
                ? errors.description
                  ? 'border-red-400 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-red-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-gray-200 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
            )}
          />
          {/* Contador de caracteres / erro */}
          <div className="flex items-center justify-between mt-1.5">
            {errors.description
              ? <p className="text-xs text-red-600 font-medium">⚠ {errors.description}</p>
              : descTooShort
                ? <p className="text-xs text-orange-600 font-medium">Mínimo 20 caracteres ({20 - descCharCount} restantes)</p>
                : <span />}
            <span className={cn(
              'text-xs tabular-nums ml-auto',
              isNaoConforme && descCharCount < 20 ? 'text-orange-500' : 'text-gray-400',
            )}>
              {descCharCount}/5000
            </span>
          </div>
        </div>
      </section>

      {/* ── 4. Fotos ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Camera size={15} className="text-brand-primary" />
            Fotos da Área
            <span className="text-red-500">*</span>
          </h2>
          <span className="text-xs text-gray-400">{photos.length}/10</span>
        </div>

        {/* Grid de thumbnails */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((ph) => (
              <PhotoThumb key={ph.id} photo={ph} onRemove={() => removePhoto(ph.id)} />
            ))}
          </div>
        )}

        {/* Input de câmera — oculto, ativado pelo botão */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"   // Abre câmera traseira no mobile
          multiple
          className="sr-only"
          aria-label="Selecionar fotos"
          onChange={handleFilesChange}
          id="photo-input"
        />

        {/* Botão de adicionar fotos */}
        {photos.length < 10 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 w-full h-24 rounded-2xl border-2 border-dashed',
              'transition-all duration-150 active:scale-[0.98]',
              errors.photos
                ? 'border-red-400 bg-red-50 text-red-600'
                : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-brand-primary/50 hover:bg-brand-primary/3 hover:text-brand-primary',
            )}
          >
            <ImagePlus size={22} />
            <span className="text-xs font-semibold">
              {photos.length === 0 ? 'Adicionar foto / tirar foto' : 'Adicionar mais fotos'}
            </span>
          </button>
        )}

        {errors.photos && <p className="text-xs text-red-500 font-medium">⚠ {errors.photos}</p>}
        <p className="text-[11px] text-gray-400 flex items-start gap-1.5 leading-relaxed">
          <Info size={11} className="flex-shrink-0 mt-0.5" />
          No celular, o botão abre diretamente a câmera traseira. Você pode selecionar até 10 fotos por auditoria.
        </p>
      </section>

      {/* ── Botão Submit ──────────────────────────────────────────────── */}
      <div className="pb-8">
        <Button
          size="lg"
          variant={isNaoConforme ? 'destructive' : 'accent'}
          className="w-full font-bold text-base py-4 rounded-2xl shadow-lg"
          onClick={handleSubmit}
          disabled={pageState === 'SUBMITTING'}
        >
          {pageState === 'SUBMITTING' ? (
            <><Loader2 size={20} className="animate-spin" /> Registrando auditoria...</>
          ) : (
            <><Send size={18} /> Registrar Auditoria</>
          )}
        </Button>
        <p className="text-center text-xs text-gray-400 mt-3">
          O registro será enviado ao Setor de Qualidade para avaliação.
        </p>
      </div>
    </div>
  )
}

// ── Helper de linha de info ───────────────────────────────────────────────────
function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className="text-gray-400 flex-shrink-0" />
      <p className="text-xs text-gray-500">{label}:</p>
      <p className="text-xs font-semibold text-gray-800 truncate">{value}</p>
    </div>
  )
}
