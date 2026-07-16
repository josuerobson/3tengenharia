// src/pages/assets/WarehousePage.tsx
// Tela de Gestão do Almoxarifado - Controle de estoque de ferramentas e EPIs.

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  Package,
  ArrowLeftRight,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Loader2,
  User,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge, ASSET_STATUS_BADGE } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi, type AssetCategory, type AssetLoanRequest } from '@/lib/api'
import { type Asset } from '@/data/mockData'
import BatchAllocateModal from '@/components/assets/BatchAllocateModal'

/** Agrupa solicitações que compartilham o mesmo batchId (pedido com múltiplos itens/quantidades). */
function groupRequestsByBatch(reqs: AssetLoanRequest[]): AssetLoanRequest[][] {
  const seen = new Set<string>()
  const groups: AssetLoanRequest[][] = []
  for (const req of reqs) {
    if (req.batchId) {
      if (seen.has(req.batchId)) continue
      seen.add(req.batchId)
      groups.push(reqs.filter((r) => r.batchId === req.batchId))
    } else {
      groups.push([req])
    }
  }
  return groups
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

type ActiveTab = 'inventory' | 'requests' | 'loans' | 'maintenance' | 'categories'

export default function WarehousePage() {
  const navigate = useNavigate()
  const { user, canReadPage } = useAuth()
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role?.startsWith('MANAGER')

  // ── Permissões por aba ──────────────────────────────────────────────────────
  // Inventário/Empréstimos/Manutenção/Categorias compartilham a mesma origem de
  // dados (GET /assets, gated por assets.warehouse.inventory). Solicitações &
  // Devoluções é a visão gerencial das solicitações, gated por assets.warehouse.fulfillment.
  const canInventory = canReadPage('assets.warehouse.inventory')
  const canFulfillment = canReadPage('assets.warehouse.fulfillment')

  const visibleTabs = useMemo(() => {
    const tabs: ActiveTab[] = []
    if (canInventory) tabs.push('inventory', 'loans', 'maintenance', 'categories')
    if (canFulfillment) tabs.push('requests')
    return tabs
  }, [canInventory, canFulfillment])

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [requests, setRequests] = useState<AssetLoanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Estados de UI / Navegação ──────────────────────────────────────────────
  // Abre na primeira aba que o perfil realmente enxerga — evita cair numa aba
  // vazia/inacessível para perfis customizados que só têm uma das permissões.
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => visibleTabs[0] ?? 'inventory')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal Novo Item / Editar Item (mesmo modal, editingAsset != null = modo edição)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [assetTag, setAssetTag] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [acquisitionValue, setAcquisitionValue] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Modal de Categoria (Nova / Editar)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryModalSubmitting, setCategoryModalSubmitting] = useState(false)
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null)

  // Modal de Atendimento / Alocação
  const [allocateModalOpen, setAllocateModalOpen] = useState(false)
  const [selectedRequestForAllocation, setSelectedRequestForAllocation] = useState<AssetLoanRequest | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [allocationNotes, setAllocationNotes] = useState('')
  const [allocationPhotos, setAllocationPhotos] = useState<string[]>([])
  const [allocationSubmitting, setAllocationSubmitting] = useState(false)
  const [allocationError, setAllocationError] = useState<string | null>(null)

  // Modal de Alocação em Lote (pedido com múltiplos itens)
  const [batchAllocateGroup, setBatchAllocateGroup] = useState<AssetLoanRequest[] | null>(null)

  // Modal de Validação de Devolução
  const [validateModalOpen, setValidateModalOpen] = useState(false)
  const [selectedRequestForValidation, setSelectedRequestForValidation] = useState<AssetLoanRequest | null>(null)
  const [validationNotes, setValidationNotes] = useState('')
  const [validationPhotos, setValidationPhotos] = useState<string[]>([])
  const [validationStatus, setValidationStatus] = useState<'OK' | 'OK_WITH_DAMAGE' | 'DEFECTIVE'>('OK')
  const [validationSubmitting, setValidationSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Modal Devolução (Legado)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState<Asset | null>(null)
  const [returnNotes, setReturnNotes] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)

  // Fotos de devolução (Legado)
  const [returnPhotoPreview, setReturnPhotoPreview] = useState<string | null>(null)
  const [returnPhotoBase64, setReturnPhotoBase64] = useState<string | null>(null)

  // Lightbox de ampliação de fotos (galeria com navegação)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)

  const handleZoomPhoto = useCallback((photoUrl: string, gallery?: (string | null | undefined)[]) => {
    const cleanGallery = gallery ? (gallery.filter(Boolean) as string[]) : [photoUrl]
    setLightboxPhotos(cleanGallery)
    const idx = cleanGallery.indexOf(photoUrl)
    setLightboxIndex(idx >= 0 ? idx : 0)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(-1)
    setLightboxPhotos([])
  }, [])

  // Navegação por teclado no lightbox (setas + Esc)
  useEffect(() => {
    if (lightboxIndex < 0 || lightboxPhotos.length === 0) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex((prev) => prev - 1)
      } else if (e.key === 'ArrowRight' && lightboxIndex < lightboxPhotos.length - 1) {
        setLightboxIndex((prev) => prev + 1)
      } else if (e.key === 'Escape') {
        closeLightbox()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, lightboxPhotos, closeLightbox])

  // Modal Reparo/Manutenção
  const [repairModalOpen, setRepairModalOpen] = useState(false)
  const [selectedAssetForRepair, setSelectedAssetForRepair] = useState<Asset | null>(null)

  // Fotos do cadastro de item (até 4, novo ou edição)
  const [assetPhotos, setAssetPhotos] = useState<string[]>([])
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [repairAction, setRepairAction] = useState<'RESOLVED' | 'WRITTEN_OFF'>('RESOLVED')
  const [repairSubmitting, setRepairSubmitting] = useState(false)
  const [repairError, setRepairError] = useState<string | null>(null)

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  // Cada chamada só é feita se o perfil tiver a permissão correspondente no
  // backend — evita que uma única rota negada (403) derrube o Promise.all
  // inteiro para perfis customizados que só têm acesso parcial a esta página.
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [assetsData, categoriesData, requestsData] = await Promise.all([
        canInventory ? assetsApi.list() : Promise.resolve([]),
        assetsApi.listCategories(),
        canFulfillment ? assetsApi.listLoanRequests() : Promise.resolve([]),
      ])
      setAssets(assetsData)
      setCategories(categoriesData)
      setRequests(requestsData)
      if (categoriesData.length > 0) {
        setCategoryId(categoriesData[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do almoxarifado:', err)
      setError(err?.message ?? 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [canInventory, canFulfillment])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const handleOpenReturnModal = useCallback((asset: Asset) => {
    setSelectedAssetForReturn(asset)
    setReturnNotes('')
    setReturnError(null)
    setReturnModalOpen(true)
  }, [])

  const handleReturnPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (returnPhotoPreview) URL.revokeObjectURL(returnPhotoPreview)
    setReturnPhotoPreview(file ? URL.createObjectURL(file) : null)

    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.6)
        setReturnPhotoBase64(compressed)
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err)
        const reader = new FileReader()
        reader.onloadend = () => {
          setReturnPhotoBase64(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    } else {
      setReturnPhotoBase64(null)
    }
  }

  const handleRemoveReturnPhoto = useCallback(() => {
    if (returnPhotoPreview) URL.revokeObjectURL(returnPhotoPreview)
    setReturnPhotoPreview(null)
    setReturnPhotoBase64(null)
  }, [returnPhotoPreview])

  useEffect(() => {
    if (!returnModalOpen) {
      handleRemoveReturnPhoto()
    }
  }, [returnModalOpen, handleRemoveReturnPhoto])

  const handleReturnSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssetForReturn?.activeLoanId) return
    try {
      setReturnSubmitting(true)
      setReturnError(null)
      await assetsApi.returnLoan(selectedAssetForReturn.activeLoanId, {
        returnNotes: returnNotes.trim() || undefined,
        returnPhotoUrl: returnPhotoBase64 || null,
      })
      setReturnModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao devolver item:', err)
      setReturnError(err?.message ?? 'Falha ao devolver item. Tente novamente.')
    } finally {
      setReturnSubmitting(false)
    }
  }, [selectedAssetForReturn, returnNotes, returnPhotoBase64, loadAssets])

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssetForRepair) return

    const parsedCost = parseFloat(repairCost.replace(',', '.'))
    if (isNaN(parsedCost) || parsedCost < 0) {
      setRepairError('Custo de reparo deve ser um valor numérico válido maior ou igual a zero.')
      return
    }

    try {
      setRepairSubmitting(true)
      setRepairError(null)
      await assetsApi.resolveMaintenance({
        assetId: selectedAssetForRepair.id,
        resolutionNotes: resolutionNotes.trim(),
        repairCost: parsedCost,
        action: repairAction,
      })
      setRepairModalOpen(false)
      setSelectedAssetForRepair(null)
      setResolutionNotes('')
      setRepairCost('')
      setRepairAction('RESOLVED')
      loadAssets()
    } catch (err: any) {
      console.error(err)
      setRepairError(err?.message ?? 'Erro ao relatar o reparo do equipamento.')
    } finally {
      setRepairSubmitting(false)
    }
  }

  // ── Métricas (KPIs) ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = assets.length
    const available = assets.filter((a) => a.currentStatus === 'AVAILABLE').length
    const loaned = assets.filter((a) => a.currentStatus === 'LOANED').length
    const maintenance = assets.filter((a) => a.currentStatus === 'MAINTENANCE' || a.currentStatus === 'DAMAGED').length
    return { total, available, loaned, maintenance }
  }, [assets])

  // ── Filtros e Busca ────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim()
    return assets.filter((a) => {
      const matchesSearch =
        !q ||
        a.description.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q) ||
        (a.model ?? '').toLowerCase().includes(q) ||
        (a.serialNumber ?? '').toLowerCase().includes(q) ||
        (a.currentBorrowee ?? '').toLowerCase().includes(q)

      const matchesCategory = categoryFilter === 'ALL' || a.categoryId === categoryFilter
      const matchesStatus = statusFilter === 'ALL' || a.currentStatus === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [assets, search, categoryFilter, statusFilter])

  // Empréstimos Ativos
  const activeLoans = useMemo(() => {
    return assets.filter((a) => a.currentStatus === 'LOANED')
  }, [assets])

  // Itens em Manutenção
  const maintenanceAssets = useMemo(() => {
    return assets.filter((a) => a.currentStatus === 'MAINTENANCE' || a.currentStatus === 'DAMAGED')
  }, [assets])

  // ── Handlers do Modal ──────────────────────────────────────────────────────
  const handleOpenNewModal = () => {
    setEditingAsset(null)
    setAssetTag('')
    setDescription('')
    if (categories.length > 0) setCategoryId(categories[0].id)
    setBrand('')
    setModel('')
    setSerialNumber('')
    setAcquisitionDate('')
    setAcquisitionValue('')
    setLocation('')
    setNotes('')
    setAssetPhotos([])
    setModalError(null)
    setNewModalOpen(true)
  }

  const handleOpenEditModal = useCallback((asset: Asset) => {
    setEditingAsset(asset)
    setAssetTag(asset.assetTag)
    setDescription(asset.description)
    setCategoryId(asset.categoryId ?? '')
    setBrand(asset.brand ?? '')
    setModel(asset.model ?? '')
    setSerialNumber(asset.serialNumber ?? '')
    setAcquisitionDate(asset.acquisitionDate ? asset.acquisitionDate.slice(0, 10) : '')
    setAcquisitionValue(asset.acquisitionValue != null ? String(asset.acquisitionValue) : '')
    setLocation(asset.location ?? '')
    setNotes(asset.notes ?? '')
    setAssetPhotos([asset.photoUrl, asset.photoUrl2, asset.photoUrl3, asset.photoUrl4].filter(Boolean) as string[])
    setModalError(null)
    setNewModalOpen(true)
  }, [])

  const handleAssetPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const base64Photos: string[] = []
    for (let i = 0; i < files.length; i++) {
      if (base64Photos.length + assetPhotos.length >= 4) break
      try {
        const compressed = await compressImage(files[i], 800, 800, 0.6)
        base64Photos.push(compressed)
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err)
      }
    }
    setAssetPhotos((prev) => [...prev, ...base64Photos].slice(0, 4))
  }

  const handleRemoveAssetPhoto = useCallback((index: number) => {
    setAssetPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  useEffect(() => {
    if (!newModalOpen) {
      setEditingAsset(null)
      setAssetPhotos([])
      setAssetTag('')
      setDescription('')
      if (categories.length > 0) {
        setCategoryId(categories[0].id)
      } else {
        setCategoryId('')
      }
      setBrand('')
      setModel('')
      setSerialNumber('')
      setAcquisitionDate('')
      setAcquisitionValue('')
      setLocation('')
      setNotes('')
      setModalError(null)
    }
  }, [newModalOpen, categories])

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetTag.trim()) {
      setModalError('Código Patrimonial é obrigatório.')
      return
    }
    if (!categoryId) {
      setModalError('Categoria é obrigatória.')
      return
    }

    setModalSubmitting(true)
    setModalError(null)

    const payload = {
      assetTag: assetTag.trim(),
      description: description.trim(),
      categoryId,
      brand: brand.trim() || null,
      model: model.trim() || null,
      serialNumber: serialNumber.trim() || null,
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : null,
      acquisitionValue: acquisitionValue ? parseFloat(acquisitionValue) : null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      photoUrl: assetPhotos[0] || null,
      photoUrl2: assetPhotos[1] || null,
      photoUrl3: assetPhotos[2] || null,
      photoUrl4: assetPhotos[3] || null,
    }

    try {
      if (editingAsset) {
        await assetsApi.update(editingAsset.id, payload)
      } else {
        await assetsApi.create(payload)
      }
      setNewModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao salvar item:', err)
      setModalError(err?.message ?? 'Ocorreu um erro ao salvar o item.')
    } finally {
      setModalSubmitting(false)
    }
  }

  // ── Handlers de Categoria ──────────────────────────────────────────────────
  const handleOpenCategoryModal = (cat: AssetCategory | null = null) => {
    setEditingCategory(cat)
    setCategoryName(cat ? cat.name : '')
    setCategoryModalError(null)
    setCategoryModalOpen(true)
  }

  const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      setCategoryModalError('Nome da categoria é obrigatório.')
      return
    }

    setCategoryModalSubmitting(true)
    setCategoryModalError(null)

    try {
      if (editingCategory) {
        await assetsApi.updateCategory(editingCategory.id, { name: categoryName.trim() })
      } else {
        await assetsApi.createCategory({ name: categoryName.trim() })
      }
      setCategoryModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err)
      setCategoryModalError(err?.message ?? 'Ocorreu um erro ao salvar a categoria.')
    } finally {
      setCategoryModalSubmitting(false)
    }
  }

  const handleToggleCategoryActive = async (cat: AssetCategory) => {
    try {
      await assetsApi.updateCategory(cat.id, { isActive: !cat.isActive })
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao alternar status da categoria:', err)
      alert(err?.message ?? 'Ocorreu um erro.')
    }
  }

  // ── Handlers de Atendimento (Alocação) ──────────────────────────────────────
  const handleOpenAllocateModal = (req: AssetLoanRequest) => {
    setSelectedRequestForAllocation(req)
    setSelectedAssetId('')
    setAllocationNotes('')
    setAllocationPhotos([])
    setAllocationError(null)
    setAllocateModalOpen(true)
  }

  const handleAllocationPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const base64Photos: string[] = []
    for (let i = 0; i < files.length; i++) {
      if (base64Photos.length + allocationPhotos.length >= 4) break
      try {
        const compressed = await compressImage(files[i], 800, 800, 0.6)
        base64Photos.push(compressed)
      } catch (err) {
        console.error('Erro ao comprimir foto de envio:', err)
      }
    }
    setAllocationPhotos((prev) => [...prev, ...base64Photos].slice(0, 4))
  }

  const handleRemoveAllocationPhoto = (index: number) => {
    setAllocationPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAllocateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequestForAllocation) return
    if (!selectedAssetId) {
      setAllocationError('Por favor, selecione um bem físico para alocar.')
      return
    }

    setAllocationSubmitting(true)
    setAllocationError(null)

    try {
      await assetsApi.allocateLoanRequest(selectedRequestForAllocation.id, {
        allocatedAssetId: selectedAssetId,
        checkoutPhoto1: allocationPhotos[0] || null,
        checkoutPhoto2: allocationPhotos[1] || null,
        checkoutPhoto3: allocationPhotos[2] || null,
        checkoutPhoto4: allocationPhotos[3] || null,
        checkoutNotes: allocationNotes.trim() || null
      })
      setAllocateModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao alocar solicitação:', err)
      setAllocationError(err?.message ?? 'Ocorreu um erro ao realizar o envio.')
    } finally {
      setAllocationSubmitting(false)
    }
  }

  // ── Handlers de Validação de Devolução ──────────────────────────────────────
  const handleOpenValidateModal = (req: AssetLoanRequest) => {
    setSelectedRequestForValidation(req)
    setValidationNotes('')
    setValidationPhotos([])
    setValidationStatus('OK')
    setValidationError(null)
    setValidateModalOpen(true)
  }

  const handleValidationPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const base64Photos: string[] = []
    for (let i = 0; i < files.length; i++) {
      if (base64Photos.length + validationPhotos.length >= 4) break
      try {
        const compressed = await compressImage(files[i], 800, 800, 0.6)
        base64Photos.push(compressed)
      } catch (err) {
        console.error('Erro ao comprimir foto de baixa:', err)
      }
    }
    setValidationPhotos((prev) => [...prev, ...base64Photos].slice(0, 4))
  }

  const handleRemoveValidationPhoto = (index: number) => {
    setValidationPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleValidateReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequestForValidation) return

    setValidationSubmitting(true)
    setValidationError(null)

    try {
      await assetsApi.validateReturn(selectedRequestForValidation.id, {
        validationStatus,
        validationNotes: validationNotes.trim() || null,
        validationPhoto1: validationPhotos[0] || null,
        validationPhoto2: validationPhotos[1] || null,
        validationPhoto3: validationPhotos[2] || null,
        validationPhoto4: validationPhotos[3] || null
      })
      setValidateModalOpen(false)
      loadAssets()
    } catch (err: any) {
      console.error('Erro ao validar devolução:', err)
      setValidationError(err?.message ?? 'Ocorreu um erro ao validar.')
    } finally {
      setValidationSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Warehouse className="text-brand-primary w-7 h-7" />
            Almoxarifado
          </h1>
          <p className="text-sm text-gray-500">
            Controle do estoque físico, registro de novos patrimônios e acompanhamento de empréstimos e avarias.
          </p>
        </div>

        {isManagerOrAdmin && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button onClick={handleOpenNewModal} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Total de Itens</span>
            <span className="text-2xl font-bold text-gray-900 leading-none mt-1">
              {loading ? '...' : metrics.total}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Disponíveis</span>
            <span className="text-2xl font-bold text-emerald-600 leading-none mt-1">
              {loading ? '...' : metrics.available}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Empréstimos</span>
            <span className="text-2xl font-bold text-blue-600 leading-none mt-1">
              {loading ? '...' : metrics.loaned}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-white border-gray-100 shadow-sm">
          <div className="p-3 bg-red-50 rounded-xl text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400">Manutenção</span>
            <span className="text-2xl font-bold text-red-600 leading-none mt-1">
              {loading ? '...' : metrics.maintenance}
            </span>
          </div>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Erro ao carregar almoxarifado:</span> {error}
          </div>
          <Button size="sm" variant="ghost" onClick={loadAssets} className="text-red-800 hover:bg-red-100 shrink-0">
            Recarregar
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
        {canInventory && (
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative shrink-0',
            activeTab === 'inventory'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Inventário Geral
        </button>
        )}
        {canFulfillment && (
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative shrink-0',
            activeTab === 'requests'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Solicitações & Devoluções
          {requests.filter(r => r.status === 'PENDING' || r.status === 'RETURNING').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
              {requests.filter(r => r.status === 'PENDING' || r.status === 'RETURNING').length}
            </span>
          )}
        </button>
        )}
        {canInventory && (
        <button
          onClick={() => setActiveTab('loans')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative shrink-0',
            activeTab === 'loans'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Empréstimos Ativos
          {activeLoans.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full">
              {activeLoans.length}
            </span>
          )}
        </button>
        )}
        {canInventory && (
        <button
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative shrink-0',
            activeTab === 'maintenance'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Manutenção
          {maintenanceAssets.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
              {maintenanceAssets.length}
            </span>
          )}
        </button>
        )}
        {canInventory && (
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            'px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors relative shrink-0',
            activeTab === 'categories'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          )}
        >
          Categorias
        </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
          <p className="text-sm text-gray-500 font-medium">Buscando informações do estoque...</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Tab 1: Inventário Geral */}
          {activeTab === 'inventory' && (
            <>
              {/* Filtros e Busca */}
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5 pointer-events-none" />
                  <Input
                    placeholder="Pesquisar por PAT, descrição, marca, responsável..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>

                {/* Filtro Categoria */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 hidden sm:inline shrink-0" />
                  <div className="w-full md:w-56">
                    <SearchableSelect
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      options={[
                        { value: 'ALL', label: 'Todas Categorias' },
                        ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                      ]}
                      placeholder="Todas Categorias"
                      searchPlaceholder="Buscar categoria..."
                      emptyMessage="Nenhuma categoria encontrada."
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Filtro Status */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 w-full md:w-auto rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="ALL">Todos Status</option>
                    <option value="AVAILABLE">Disponível</option>
                    <option value="LOANED">Emprestado</option>
                    <option value="MAINTENANCE">Em Manutenção</option>
                    <option value="DAMAGED">Danificado</option>
                    <option value="WRITTEN_OFF">Baixado</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Patrimônio */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Patrimônio</th>
                      <th className="px-6 py-4">Descrição do Bem</th>
                      <th className="px-6 py-4">Localização / Obras</th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          Nenhum bem patrimonial encontrado no almoxarifado.
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="block font-bold text-gray-900">{asset.assetTag}</span>
                            <span className="block text-xs text-gray-400 font-medium mt-0.5">
                              {asset.categoryData?.name ?? asset.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-medium text-gray-800 leading-tight">
                              {asset.description}
                            </span>
                            {asset.brand && (
                              <span className="block text-xs text-gray-400 mt-0.5">
                                {asset.brand} {asset.model && `• ${asset.model}`} {asset.serialNumber && `(S/N: ${asset.serialNumber})`}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {asset.location ?? 'Almoxarifado Central'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {asset.currentBorrowee ? (
                              <span className="inline-flex items-center gap-1 text-gray-800 font-semibold">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {asset.currentBorrowee}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={ASSET_STATUS_BADGE[asset.currentStatus]?.variant ?? 'default'} dot>
                              {ASSET_STATUS_BADGE[asset.currentStatus]?.label ?? asset.currentStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            {isManagerOrAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditModal(asset)}
                                className="text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary/5 font-bold"
                              >
                                Editar
                              </Button>
                            )}
                            {asset.currentStatus !== 'MAINTENANCE' && asset.currentStatus !== 'WRITTEN_OFF' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate('/assets/maintenance/new')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                              >
                                Relatar Defeito
                              </Button>
                            )}
                            {asset.currentStatus === 'MAINTENANCE' && isManagerOrAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAssetForRepair(asset)
                                  setRepairModalOpen(true)
                                  setResolutionNotes('')
                                  setRepairCost('0,00')
                                  setRepairAction('RESOLVED')
                                  setRepairError(null)
                                }}
                                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 font-bold"
                              >
                                Relatar Reparo
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tab 2: Empréstimos Ativos */}
          {activeTab === 'loans' && (
            <div className="divide-y divide-gray-100">
              <div className="p-4 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-500">
                  Total de empréstimos operando agora: {activeLoans.length}
                </span>
              </div>

              {activeLoans.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhum empréstimo ativo no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {activeLoans.map((asset) => (
                    <Card key={asset.id} className="p-4 border-gray-100 bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patrimônio</span>
                            <span className="block text-sm font-bold text-gray-900 mt-0.5">{asset.assetTag}</span>
                          </div>
                          <Badge variant="loaned">Emprestado</Badge>
                        </div>

                        <div className="mt-3">
                          <span className="block text-xs font-semibold text-gray-400">Descrição do Item</span>
                          <span className="text-sm font-medium text-gray-800">{asset.description}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-50">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              Responsável
                            </span>
                            <span className="text-xs font-bold text-gray-800 block mt-0.5 truncate">
                              {asset.currentBorrowee}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              Destino
                            </span>
                            <span className="text-xs font-medium text-gray-800 block mt-0.5 truncate">
                              {asset.location ?? 'Obra externa'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isManagerOrAdmin && (
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReturnModal(asset)}
                            className="text-xs font-semibold flex items-center gap-1.5 border-brand-primary text-brand-primary hover:bg-brand-primary/5 h-9 rounded-lg"
                          >
                            <ArrowLeftRight size={13} />
                            Devolver Ferramenta
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Solicitações & Devoluções */}
          {activeTab === 'requests' && (() => {
            const pending = requests.filter(r => r.status === 'PENDING')
            const pendingGroups = groupRequestsByBatch(pending)
            const returning = requests.filter(r => r.status === 'RETURNING')
            const activeRequests = requests.filter(r => r.status === 'LOANED')

            return (
              <div className="divide-y divide-gray-100">
                {/* Seção: Pendentes */}
                <div className="p-4 bg-amber-50/60">
                  <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4" />
                    Solicitações Pendentes ({pending.length})
                  </h3>
                  {pendingGroups.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhuma solicitação pendente.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pendingGroups.map((group) => {
                        const req = group[0]

                        if (group.length === 1) {
                          return (
                            <Card key={req.id} className="p-4 border-amber-200/60 bg-white shadow-sm">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Solicitante</span>
                                  <span className="block text-sm font-bold text-gray-900 truncate">{req.requesterEmployee?.fullName}</span>
                                  <span className="block text-xs text-gray-500 mt-1 font-medium">
                                    Categoria: <span className="text-gray-700">{req.category?.name}</span>
                                  </span>
                                  {req.requestNotes && (
                                    <p className="text-xs text-gray-400 mt-1 italic">"{req.requestNotes}"</p>
                                  )}
                                </div>
                                <Badge variant="loaned" className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">Pendente</Badge>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenAllocateModal(req)}
                                  className="text-xs font-semibold flex items-center gap-1.5 h-9"
                                >
                                  <Package size={13} />
                                  Alocar e Enviar
                                </Button>
                              </div>
                            </Card>
                          )
                        }

                        // Pedido com múltiplos itens/quantidades (mesmo batchId)
                        const countsByCategory = new Map<string, number>()
                        for (const item of group) {
                          const label = item.category?.name ?? '—'
                          countsByCategory.set(label, (countsByCategory.get(label) ?? 0) + 1)
                        }
                        return (
                          <Card key={req.batchId} className="p-4 border-amber-200/60 bg-white shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Solicitante</span>
                                <span className="block text-sm font-bold text-gray-900 truncate">{req.requesterEmployee?.fullName}</span>
                                <div className="mt-1.5 space-y-0.5">
                                  {Array.from(countsByCategory.entries()).map(([label, count]) => (
                                    <span key={label} className="block text-xs text-gray-500 font-medium">
                                      {count}x <span className="text-gray-700">{label}</span>
                                    </span>
                                  ))}
                                </div>
                                {req.requestNotes && (
                                  <p className="text-xs text-gray-400 mt-1 italic">"{req.requestNotes}"</p>
                                )}
                              </div>
                              <Badge variant="loaned" className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                                {group.length} itens
                              </Badge>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setBatchAllocateGroup(group)}
                                className="text-xs font-semibold flex items-center gap-1.5 h-9"
                              >
                                <Package size={13} />
                                Alocar e Enviar Pedido
                              </Button>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Seção: Em Trânsito de Devolução */}
                <div className="p-4 bg-orange-50/40">
                  <h3 className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-3">
                    <ArrowLeftRight className="w-4 h-4" />
                    Em Trânsito de Devolução ({returning.length})
                  </h3>
                  {returning.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhuma devolução pendente de validação.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {returning.map((req) => (
                        <Card key={req.id} className="p-4 border-orange-200/60 bg-white shadow-sm">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Devolvendo</span>
                              <span className="block text-sm font-bold text-gray-900 truncate">{req.requesterEmployee?.fullName}</span>
                              <span className="block text-xs text-gray-500 mt-1">
                                Bem: <span className="font-medium text-gray-700">{req.allocatedAsset?.description ?? req.category?.name}</span>
                              </span>
                              {req.isWorking === false && (
                                <span className="inline-block mt-1.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                  ⚠ Relatou defeito
                                </span>
                              )}
                              {req.hasDamage && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full ml-1">
                                  ⚠ Relatou avaria
                                </span>
                              )}
                              {req.returnNotes && (
                                <p className="text-xs text-gray-400 mt-1 italic">"{req.returnNotes}"</p>
                              )}
                            </div>
                            <Badge variant="critical" className="shrink-0">Retornando</Badge>
                          </div>
                          {/* Fotos de Devolução */}
                          {(req.returnPhoto1 || req.returnPhoto2) && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {[req.returnPhoto1, req.returnPhoto2, req.returnPhoto3, req.returnPhoto4].filter(Boolean).map((photo, idx) => (
                                <img
                                  key={idx}
                                  src={photo!}
                                  alt={`Foto de devolução ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity"
                                  onClick={() => handleZoomPhoto(photo!, [req.returnPhoto1, req.returnPhoto2, req.returnPhoto3, req.returnPhoto4])}
                                />
                              ))}
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleOpenValidateModal(req)}
                              className="text-xs font-semibold flex items-center gap-1.5 h-9"
                            >
                              <CheckCircle2 size={13} />
                              Validar Devolução
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seção: Empréstimos Ativos (baseados em requests) */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4" />
                    Com o Colaborador ({activeRequests.length})
                  </h3>
                  {activeRequests.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhum item ativo com colaboradores.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeRequests.map((req) => (
                        <Card key={req.id} className="p-4 border-blue-200/60 bg-white shadow-sm">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Com</span>
                              <span className="block text-sm font-bold text-gray-900 truncate">{req.requesterEmployee?.fullName}</span>
                              <span className="block text-xs text-gray-500 mt-1">
                                Bem: <span className="font-medium text-gray-700">{req.allocatedAsset?.description ?? req.category?.name}</span>
                              </span>
                              {req.checkoutAt && (
                                <span className="block text-xs text-gray-400 mt-0.5">
                                  Saiu em: {new Date(req.checkoutAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <Badge variant="loaned" className="shrink-0">Ativo</Badge>
                          </div>
                          {/* Fotos de Envio */}
                          {(req.checkoutPhoto1 || req.checkoutPhoto2) && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {[req.checkoutPhoto1, req.checkoutPhoto2, req.checkoutPhoto3, req.checkoutPhoto4].filter(Boolean).map((photo, idx) => (
                                <img
                                  key={idx}
                                  src={photo!}
                                  alt={`Foto de envio ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                />
                              ))}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Tab Categorias */}
          {activeTab === 'categories' && (
            <div>
              <div className="p-4 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-500">
                  {categories.length} categoria(s) cadastrada(s)
                </span>
                <Button size="sm" onClick={() => handleOpenCategoryModal(null)} className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Nova Categoria
                </Button>
              </div>
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhuma categoria cadastrada ainda.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${cat.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <span className="font-semibold text-gray-800 text-sm">{cat.name}</span>
                          {!cat.isActive && (
                            <span className="ml-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inativa</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="text-xs text-gray-500 hover:text-gray-800 h-8"
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`text-xs h-8 ${cat.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                        >
                          {cat.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Manutenções / Avarias */}
          {activeTab === 'maintenance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Patrimônio</th>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4">Localização Anterior</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                  {maintenanceAssets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        Nenhum equipamento em manutenção no momento! Todos operacionais.
                      </td>
                    </tr>
                  ) : (
                    maintenanceAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900 block">{asset.assetTag}</span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            {asset.categoryData?.name ?? asset.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-800">{asset.description}</span>
                          {asset.brand && (
                            <span className="block text-xs text-gray-400 mt-0.5">
                              {asset.brand} {asset.model && `- ${asset.model}`}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {asset.location ?? 'Almoxarifado Central'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Badge variant={ASSET_STATUS_BADGE[asset.currentStatus]?.variant ?? 'critical'} dot>
                            {ASSET_STATUS_BADGE[asset.currentStatus]?.label ?? asset.currentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Modal de Novo Item / Editar Item (Dialog) ─────────────────────────── */}
      <Dialog
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={editingAsset ? 'Editar Item Patrimonial' : 'Novo Item Patrimonial'}
        description={
          editingAsset
            ? `Atualize os dados de ${editingAsset.assetTag}.`
            : 'Cadastre uma ferramenta, equipamento ou EPI no estoque do almoxarifado.'
        }
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{modalError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalAssetTag" required>
                Código Patrimonial
              </Label>
              <Input
                id="modalAssetTag"
                placeholder="Ex: PAT-0001"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="mt-1.5 h-11"
                required
              />
            </div>

            <div>
              <Label htmlFor="modalCategory" required>
                Categoria
              </Label>
              <div className="mt-1.5">
                <SearchableSelect
                  id="modalCategory"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categories.filter(c => c.isActive).map((cat) => ({ value: cat.id, label: cat.name }))}
                  placeholder="Selecione uma categoria..."
                  searchPlaceholder="Buscar categoria..."
                  emptyMessage="Nenhuma categoria encontrada."
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="modalDescription">
              Descrição do Bem
            </Label>
            <Input
              id="modalDescription"
              placeholder="Ex: Furadeira de Impacto Bosch 13mm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalBrand">Marca (opcional)</Label>
              <Input
                id="modalBrand"
                placeholder="Ex: Bosch"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalModel">Modelo (opcional)</Label>
              <Input
                id="modalModel"
                placeholder="Ex: GSB 13 RE"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalSerial">Nº de Série (opcional)</Label>
              <Input
                id="modalSerial"
                placeholder="Ex: BSH-2024"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalLocation">Localização física (opcional)</Label>
              <Input
                id="modalLocation"
                placeholder="Ex: Prateleira A1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modalAcquisitionDate">Data de Compra (opcional)</Label>
              <Input
                id="modalAcquisitionDate"
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="modalAcquisitionValue">Valor de Aquisição (R$)</Label>
              <Input
                id="modalAcquisitionValue"
                type="number"
                step="0.01"
                placeholder="Ex: 485.90"
                value={acquisitionValue}
                onChange={(e) => setAcquisitionValue(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="modalNotes">Observações adicionais (opcional)</Label>
            <Textarea
              id="modalNotes"
              placeholder="Ex: Comprado com garantia estendida de 2 anos."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] mt-1.5"
            />
          </div>

          <div>
            <Label>Fotos do Equipamento (até 4, opcional)</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {assetPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <img
                    src={photo}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                    onClick={() => handleZoomPhoto(photo, assetPhotos)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAssetPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {assetPhotos.length < 4 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-400">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleAssetPhotoChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNewModalOpen(false)}
              disabled={modalSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={modalSubmitting}
            >
              {modalSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : editingAsset ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Item'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Devolução (Dialog) ────────────────────────────────────────── */}
      <Dialog
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Registrar Devolução"
        description={`Registrar devolução do bem patrimonial ${selectedAssetForReturn?.assetTag}`}
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4 pt-2">
          {returnError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{returnError}</p>
            </div>
          )}

          <div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Resumo do Empréstimo
              </p>
              <div className="flex justify-between text-xs text-gray-700">
                <span className="font-medium text-gray-500">Ferramenta:</span>
                <span className="font-semibold text-gray-900">{selectedAssetForReturn?.description}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-700">
                <span className="font-medium text-gray-500">Responsável:</span>
                <span className="font-semibold text-gray-900">{selectedAssetForReturn?.currentBorrowee}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-700">
                <span className="font-medium text-gray-500">Localização atual:</span>
                <span className="font-semibold text-gray-900">{selectedAssetForReturn?.location ?? 'Obra externa'}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="returnNotes">Observações da Devolução (opcional)</Label>
            <Textarea
              id="returnNotes"
              placeholder="Ex: Devolvido limpo e funcionando perfeitamente."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="min-h-[80px] mt-1.5"
            />
          </div>

          <div>
            <Label>Foto do Estado do Equipamento (Opcional)</Label>
            {returnPhotoPreview ? (
              <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-w-sm mt-1.5">
                <img
                  src={returnPhotoPreview}
                  alt="Preview da Devolução"
                  className="w-full h-48 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={handleRemoveReturnPhoto}
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
                    onChange={handleReturnPhotoChange}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReturnModalOpen(false)}
              disabled={returnSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={returnSubmitting}
            >
              {returnSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Devolvendo...
                </>
              ) : (
                'Confirmar Devolução'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Reparo/Resolução (Dialog) ────────────────────────────────── */}
      <Dialog
        open={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        title="Relatar Conserto / Reparo"
        description={`Registrar conserto do bem patrimonial ${selectedAssetForRepair?.assetTag}`}
      >
        <form onSubmit={handleRepairSubmit} className="space-y-4 pt-2">
          {repairError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{repairError}</p>
            </div>
          )}

          <div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Resumo do Equipamento
              </p>
              <div className="flex justify-between text-xs text-gray-700">
                <span className="font-medium text-gray-500">Ferramenta:</span>
                <span className="font-semibold text-gray-900">{selectedAssetForRepair?.description}</span>
              </div>
              {selectedAssetForRepair?.brand && (
                <div className="flex justify-between text-xs text-gray-700">
                  <span className="font-medium text-gray-500">Marca/Modelo:</span>
                  <span className="font-semibold text-gray-900">{selectedAssetForRepair.brand} {selectedAssetForRepair.model && `• ${selectedAssetForRepair.model}`}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="resolutionNotes">Descrição do Conserto</Label>
            <Textarea
              id="resolutionNotes"
              required
              placeholder="Descreva detalhadamente o reparo efetuado. Ex: Trocada a carcaça de plástico trincada e substituído o rolamento interno."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="min-h-[80px] mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="repairCost">Custo do Reparo (R$)</Label>
            <Input
              id="repairCost"
              required
              type="text"
              placeholder="0,00"
              value={repairCost}
              onChange={(e) => setRepairCost(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Ação / Disponibilidade</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="repairAction"
                  value="RESOLVED"
                  checked={repairAction === 'RESOLVED'}
                  onChange={() => setRepairAction('RESOLVED')}
                  className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                />
                Retornar para Disponibilidade
              </label>
              <label className="flex items-center gap-2 text-sm text-red-600 font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="repairAction"
                  value="WRITTEN_OFF"
                  checked={repairAction === 'WRITTEN_OFF'}
                  onChange={() => setRepairAction('WRITTEN_OFF')}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-600"
                />
                Dar Baixa Definitiva (Descarte)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRepairModalOpen(false)}
              disabled={repairSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={repairSubmitting}
            >
              {repairSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Finalizar Manutenção'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Categoria ─────────────────────────────────────────────────── */}
      <Dialog
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        description="Categorias são usadas para classificar os bens do almoxarifado e nas solicitações de empréstimo."
      >
        <form onSubmit={handleCreateOrUpdateCategory} className="space-y-4 pt-2">
          {categoryModalError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{categoryModalError}</p>
            </div>
          )}
          <div>
            <Label htmlFor="categoryName" required>Nome da Categoria</Label>
            <Input
              id="categoryName"
              placeholder="Ex: Ferramentas Elétricas"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="mt-1.5 h-11"
              required
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setCategoryModalOpen(false)} disabled={categoryModalSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={categoryModalSubmitting}>
              {categoryModalSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
              ) : (
                editingCategory ? 'Salvar Alterações' : 'Criar Categoria'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Alocação (Atender Solicitação) ────────────────────────────── */}
      <Dialog
        open={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        title="Alocar Bem e Enviar"
        description={`Vincule um bem físico disponível para a solicitação de: ${selectedRequestForAllocation?.requesterEmployee?.fullName}`}
      >
        <form onSubmit={handleAllocateRequest} className="space-y-4 pt-2">
          {allocationError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{allocationError}</p>
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800">Categoria solicitada</p>
            <p className="text-sm font-bold text-amber-900 mt-0.5">{selectedRequestForAllocation?.category?.name}</p>
            {selectedRequestForAllocation?.requestNotes && (
              <p className="text-xs text-amber-700 mt-1 italic">"{selectedRequestForAllocation.requestNotes}"</p>
            )}
          </div>

          <div>
            <Label htmlFor="allocateAsset" required>Bem Físico a Enviar</Label>
            <div className="mt-1.5">
              <SearchableSelect
                id="allocateAsset"
                value={selectedAssetId}
                onChange={setSelectedAssetId}
                options={assets
                  .filter(a => a.currentStatus === 'AVAILABLE' && a.categoryId === selectedRequestForAllocation?.categoryId)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.assetTag} — ${a.categoryData?.name ?? a.category}`,
                  }))}
                placeholder="Selecione um bem disponível..."
                searchPlaceholder="Buscar por código..."
                emptyMessage="Nenhum bem disponível nesta categoria."
                required
              />
            </div>
          </div>

          <div>
            <Label>Fotos do Estado de Envio (até 4)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {allocationPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveAllocationPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {allocationPhotos.length < 4 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-400">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleAllocationPhotoChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="allocationNotes">Observações do Envio (opcional)</Label>
            <Textarea
              id="allocationNotes"
              placeholder="Ex: Equipamento em perfeito estado, com acessórios originais."
              value={allocationNotes}
              onChange={(e) => setAllocationNotes(e.target.value)}
              className="min-h-[70px] mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setAllocateModalOpen(false)} disabled={allocationSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={allocationSubmitting}>
              {allocationSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
              ) : (
                'Confirmar Envio'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal de Alocação em Lote (Pedido com Múltiplos Itens) ─────────────── */}
      {batchAllocateGroup && (
        <BatchAllocateModal
          requests={batchAllocateGroup}
          assets={assets}
          onClose={() => setBatchAllocateGroup(null)}
          onSuccess={() => {
            setBatchAllocateGroup(null)
            loadAssets()
          }}
        />
      )}

      {/* ── Modal de Validação de Devolução ────────────────────────────────────── */}
      <Dialog
        open={validateModalOpen}
        onClose={() => setValidateModalOpen(false)}
        title="Validar Devolução"
        description={`Confirme a recepção do bem devolvido por: ${selectedRequestForValidation?.requesterEmployee?.fullName}`}
      >
        <form onSubmit={handleValidateReturn} className="space-y-4 pt-2">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{validationError}</p>
            </div>
          )}

          {/* Informações da devolução relatada pelo funcionário */}
          {selectedRequestForValidation && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Relatório do Funcionário</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Funcionando:</span>
                <span className={`font-bold ${selectedRequestForValidation.isWorking === false ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedRequestForValidation.isWorking === false ? 'Não' : selectedRequestForValidation.isWorking === true ? 'Sim' : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Com Avaria:</span>
                <span className={`font-bold ${selectedRequestForValidation.hasDamage ? 'text-amber-600' : 'text-green-600'}`}>
                  {selectedRequestForValidation.hasDamage ? 'Sim' : 'Não'}
                </span>
              </div>
              {selectedRequestForValidation.returnNotes && (
                <p className="text-xs text-gray-500 italic pt-1 border-t border-gray-100">
                  "{selectedRequestForValidation.returnNotes}"
                </p>
              )}
              {(selectedRequestForValidation.returnPhoto1 || selectedRequestForValidation.returnPhoto2) && (
                <div className="flex gap-2 pt-1 flex-wrap">
                  {[selectedRequestForValidation.returnPhoto1, selectedRequestForValidation.returnPhoto2, selectedRequestForValidation.returnPhoto3, selectedRequestForValidation.returnPhoto4].filter(Boolean).map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo!}
                      alt={`Foto de devolução ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity"
                      onClick={() => handleZoomPhoto(photo!, [
                        selectedRequestForValidation.returnPhoto1,
                        selectedRequestForValidation.returnPhoto2,
                        selectedRequestForValidation.returnPhoto3,
                        selectedRequestForValidation.returnPhoto4,
                      ])}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Fotos do Bem na Baixa (até 4)</Label>
            <p className="text-xs text-gray-400 mt-0.5 mb-1.5">
              Fotos tiradas pelo almoxarifado no recebimento, para registrar o estado físico do bem.
            </p>
            <div className="flex flex-wrap gap-2">
              {validationPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <img
                    src={photo}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                    onClick={() => handleZoomPhoto(photo, validationPhotos)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveValidationPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {validationPhotos.length < 4 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-400">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleValidationPhotoChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Resultado da Inspeção Física</Label>
            <div className="space-y-2 mt-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${validationStatus === 'OK' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="validationStatus"
                  value="OK"
                  checked={validationStatus === 'OK'}
                  onChange={() => setValidationStatus('OK')}
                  className="mt-0.5 w-4 h-4 text-green-600"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800">✅ Tudo certo</span>
                  <p className="text-xs text-gray-500 mt-0.5">Bem recebido em bom estado, volta a ficar disponível.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${validationStatus === 'OK_WITH_DAMAGE' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="validationStatus"
                  value="OK_WITH_DAMAGE"
                  checked={validationStatus === 'OK_WITH_DAMAGE'}
                  onChange={() => setValidationStatus('OK_WITH_DAMAGE')}
                  className="mt-0.5 w-4 h-4 text-amber-600"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800">⚠️ Tudo certo, mas com avaria</span>
                  <p className="text-xs text-gray-500 mt-0.5">Bem volta disponível, mas é registrada uma notificação de avaria.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${validationStatus === 'DEFECTIVE' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="validationStatus"
                  value="DEFECTIVE"
                  checked={validationStatus === 'DEFECTIVE'}
                  onChange={() => setValidationStatus('DEFECTIVE')}
                  className="mt-0.5 w-4 h-4 text-red-600"
                />
                <div>
                  <span className="text-sm font-bold text-red-700">❌ Com defeito / Danificado</span>
                  <p className="text-xs text-gray-500 mt-0.5">Bem vai para manutenção (status DANIFICADO). Notificação enviada ao funcionário.</p>
                </div>
              </label>
            </div>
          </div>

          {validationStatus !== 'OK' && (
            <div>
              <Label htmlFor="validationNotes">
                {validationStatus === 'OK_WITH_DAMAGE' ? 'Descrição da Avaria' : 'Descrição do Defeito / Dano'}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="validationNotes"
                placeholder={validationStatus === 'OK_WITH_DAMAGE' ? 'Descreva a avaria encontrada...' : 'Descreva o defeito ou dano encontrado...'}
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                className="min-h-[80px] mt-1.5"
                required={validationStatus === 'OK_WITH_DAMAGE' || validationStatus === 'DEFECTIVE'}
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setValidateModalOpen(false)} disabled={validationSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={validationSubmitting}
              className={validationStatus === 'DEFECTIVE' ? 'bg-red-600 hover:bg-red-700' : validationStatus === 'OK_WITH_DAMAGE' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {validationSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Validando...</>
              ) : (
                'Confirmar Validação'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Lightbox de Ampliação de Fotos (galeria com navegação) ──────────────
          Renderizado via portal com z-index acima do Dialog (z-[200]) — caso
          contrário, fica atrás de qualquer modal aberto (ex: Validar Devolução). */}
      {lightboxIndex >= 0 && lightboxPhotos.length > 0 && createPortal(
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md select-none"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-[80] shadow-lg active:scale-95"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => prev - 1)
              }}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[80] shadow-lg active:scale-95 hover:scale-105"
              title="Anterior"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center pointer-events-none">
            <img
              src={lightboxPhotos[lightboxIndex]}
              alt={`Foto Ampliada ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl animate-scale-in pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {lightboxIndex < lightboxPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => prev + 1)
              }}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[80] shadow-lg active:scale-95 hover:scale-105"
              title="Próxima"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-6 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-white text-xs font-bold font-mono shadow-md">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
