// src/pages/assets/NewLoanPage.tsx
// Formulário para registro de saída (empréstimo) de bens patrimoniais.
// Restrito a usuários ADMIN e MANAGER.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Loader2,
  Clock,
  ChevronRight,
  Search,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi, type ApiEmployee, type ApiWorksite } from '@/lib/api'
import { type Asset } from '@/data/mockData'

export default function NewLoanPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  // ── Estados de Dados ───────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [worksites, setWorksites] = useState<ApiWorksite[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Estados de Busca/Seleção ────────────────────────────────────────────────
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployee | null>(null)
  const [selectedWorksiteId, setSelectedWorksiteId] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [expectedReturnTime, setExpectedReturnTime] = useState('17:00')
  const [checkoutNotes, setCheckoutNotes] = useState('')

  // Buscas de filtros
  const [assetSearch, setAssetSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  // Estados de UI do select customizado
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)

  // Estados de Submissão
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successLoan, setSuccessLoan] = useState<any | null>(null)

  // ── Carregar Dados ─────────────────────────────────────────────────────────
  const loadFormData = useCallback(async () => {
    try {
      setLoadingData(true)
      setFetchError(null)
      const [assetsData, employeesData, worksitesData] = await Promise.all([
        assetsApi.list(),
        assetsApi.listEmployees(),
        assetsApi.listWorksites(),
      ])
      setAssets(assetsData)
      setEmployees(employeesData)
      setWorksites(worksitesData)
    } catch (err: any) {
      console.error('Erro ao carregar dados do formulário:', err)
      setFetchError(err?.message ?? 'Falha ao buscar dados no servidor.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      loadFormData()
    }
  }, [isAuthorized, loadFormData])

  // ── Filtros ────────────────────────────────────────────────────────────────
  const availableAssets = useMemo(() => {
    const q = assetSearch.toLowerCase().trim()
    return assets.filter(
      (a) =>
        a.currentStatus === 'AVAILABLE' &&
        (a.description.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          (a.brand ?? '').toLowerCase().includes(q) ||
          (a.model ?? '').toLowerCase().includes(q)),
    )
  }, [assets, assetSearch])

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim()
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.registration.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }, [employees, employeeSearch])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setShowAssetDropdown(false)
    setAssetSearch('')
  }

  const handleSelectEmployee = (emp: ApiEmployee) => {
    setSelectedEmployee(emp)
    setShowEmployeeDropdown(false)
    setEmployeeSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) {
      setSubmitError('Selecione um bem patrimonial.')
      return
    }
    if (!selectedEmployee) {
      setSubmitError('Selecione o colaborador que irá retirar.')
      return
    }

    let expectedReturnAt: string | null = null
    if (expectedReturnDate) {
      const dateTimeStr = `${expectedReturnDate}T${expectedReturnTime || '00:00'}:00`
      const dateObj = new Date(dateTimeStr)
      if (isNaN(dateObj.getTime())) {
        setSubmitError('Data de previsão de retorno inválida.')
        return
      }
      if (dateObj <= new Date()) {
        setSubmitError('A data de previsão de retorno deve ser uma data futura.')
        return
      }
      expectedReturnAt = dateObj.toISOString()
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const res = await assetsApi.createLoan({
        assetId: selectedAsset.id,
        borrowerEmployeeId: selectedEmployee.id,
        destinationWorksiteId: selectedWorksiteId || null,
        expectedReturnAt,
        checkoutNotes: checkoutNotes.trim() || null,
      })
      setSuccessLoan(res.loan)
    } catch (err: any) {
      console.error('Erro ao registrar empréstimo:', err)
      setSubmitError(err?.message ?? 'Falha ao registrar empréstimo. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSelectedAsset(null)
    setSelectedEmployee(null)
    setSelectedWorksiteId('')
    setExpectedReturnDate('')
    setExpectedReturnTime('17:00')
    setCheckoutNotes('')
    setSuccessLoan(null)
    setSubmitError(null)
    loadFormData()
  }

  // ── Render: Acesso Restrito ───────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto py-12 px-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card text-center p-8 animate-scale-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6">
            Desculpe, apenas usuários com perfil **Gestor** ou **Administrador** podem registrar saídas de bens patrimoniais.
          </p>
          <Button onClick={() => navigate('/assets/catalog')} className="w-full font-semibold">
            Ir para o Catálogo de Itens
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: Tela de Sucesso ────────────────────────────────────────────────
  if (successLoan) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 animate-scale-in text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Saída Registrada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            O empréstimo foi gravado com sucesso no banco de dados e o status do bem patrimonial foi atualizado para <span className="font-semibold text-blue-600">Emprestado</span>.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left mb-8 space-y-3.5">
            <div className="flex justify-between items-start gap-4 pb-3 border-b border-gray-200/50">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Bem Patrimonial</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{successLoan.asset.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">{successLoan.asset.brand} {successLoan.asset.model} · {successLoan.asset.assetTag}</p>
              </div>
              <Badge variant="loaned">Emprestado</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Quem Retirou</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{successLoan.borrowerEmployee.fullName}</p>
                <p className="text-[11px] text-gray-500">Matrícula: {successLoan.borrowerEmployee.registration}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Obra de Destino</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {successLoan.destinationWorksite ? successLoan.destinationWorksite.name : 'Não informada'}
                </p>
                {successLoan.destinationWorksite && (
                  <p className="text-[11px] text-gray-500">Código: {successLoan.destinationWorksite.code}</p>
                )}
              </div>
            </div>

            {successLoan.expectedReturnAt && (
              <div className="pt-3 border-t border-gray-200/50 flex items-center gap-2 text-xs text-amber-600 font-medium">
                <Clock size={14} />
                Devolução prevista para: {new Date(successLoan.expectedReturnAt).toLocaleString('pt-BR')}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/assets/catalog')} className="flex-1 font-semibold">
              Voltar ao Catálogo
            </Button>
            <Button variant="accent" onClick={handleReset} className="flex-1 font-semibold">
              Novo Empréstimo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Formulário Principal ───────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Solicitar Empréstimo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registre a saída de uma ferramenta ou equipamento para um colaborador e obra.
        </p>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center text-center gap-3">
          <AlertCircle size={28} className="text-red-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Erro de Comunicação</p>
            <p className="text-xs text-gray-500 mt-0.5">{fetchError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadFormData}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {loadingData && !fetchError ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-card">
          <Loader2 size={36} className="text-brand-primary animate-spin mb-3" />
          <p className="text-gray-500 text-sm font-medium">Carregando listas de ferramentas, colaboradores e obras...</p>
        </div>
      ) : (
        !fetchError && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 space-y-6">
            {submitError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p className="font-medium leading-relaxed">{submitError}</p>
              </div>
            )}

            {/* ── CAMPO 1: BEM PATRIMONIAL ── */}
            <div className="relative">
              <Label required>Ferramenta / Equipamento</Label>
              {selectedAsset ? (
                // Item selecionado
                <div className="mt-1.5 flex items-center justify-between p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedAsset.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedAsset.brand} {selectedAsset.model} · <span className="font-semibold text-brand-primary">{selectedAsset.assetTag}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(null)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-white px-2.5 py-1.5 rounded-lg border border-red-100 shadow-sm transition-all"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                // Dropdown buscador de itens
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssetDropdown(!showAssetDropdown)
                      setShowEmployeeDropdown(false)
                    }}
                    className={cn(
                      'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-400',
                      'flex items-center justify-between transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary',
                      showAssetDropdown && 'border-brand-primary ring-2 ring-brand-primary/20',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Wrench size={16} className="text-gray-400" />
                      Buscar ferramenta disponível pelo código ou nome...
                    </span>
                    <ChevronRight size={16} className={cn('transform transition-transform', showAssetDropdown && 'rotate-90')} />
                  </button>

                  {showAssetDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-slide-up max-h-64 flex flex-col">
                      <div className="p-2 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400 ml-2" />
                        <input
                          type="text"
                          placeholder="Digite para filtrar..."
                          value={assetSearch}
                          onChange={(e) => setAssetSearch(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-gray-900 outline-none p-1 placeholder:text-gray-400"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                        {availableAssets.length === 0 ? (
                          <p className="p-4 text-center text-xs text-gray-400">Nenhuma ferramenta disponível encontrada.</p>
                        ) : (
                          availableAssets.map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => handleSelectAsset(asset)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-gray-800">{asset.description}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {asset.brand} {asset.model} · <span className="font-semibold text-brand-primary">{asset.assetTag}</span>
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full group-hover:bg-emerald-100 transition-colors">
                                Disponível
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CAMPO 2: COLABORADOR ── */}
            <div className="relative">
              <Label required>Colaborador Retirante</Label>
              {selectedEmployee ? (
                // Colaborador selecionado
                <div className="mt-1.5 flex items-center justify-between p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedEmployee.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cargo: {selectedEmployee.position} · <span className="font-semibold">{selectedEmployee.registration}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-white px-2.5 py-1.5 rounded-lg border border-red-100 shadow-sm transition-all"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                // Dropdown buscador de colaborador
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmployeeDropdown(!showEmployeeDropdown)
                      setShowAssetDropdown(false)
                    }}
                    className={cn(
                      'w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-400',
                      'flex items-center justify-between transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary',
                      showEmployeeDropdown && 'border-brand-primary ring-2 ring-brand-primary/20',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      Buscar colaborador por nome ou matrícula...
                    </span>
                    <ChevronRight size={16} className={cn('transform transition-transform', showEmployeeDropdown && 'rotate-90')} />
                  </button>

                  {showEmployeeDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-slide-up max-h-64 flex flex-col">
                      <div className="p-2 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400 ml-2" />
                        <input
                          type="text"
                          placeholder="Digite para filtrar..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-gray-900 outline-none p-1 placeholder:text-gray-400"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                        {filteredEmployees.length === 0 ? (
                          <p className="p-4 text-center text-xs text-gray-400">Nenhum colaborador encontrado.</p>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleSelectEmployee(emp)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <p className="text-xs font-bold text-gray-800">{emp.fullName}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Cargo: {emp.position} · Matrícula: {emp.registration}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CAMPO 3: OBRA DE DESTINO ── */}
            <div>
              <Label htmlFor="worksite">Obra de Destino (Opcional)</Label>
              <select
                id="worksite"
                value={selectedWorksiteId}
                onChange={(e) => setSelectedWorksiteId(e.target.value)}
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all duration-150"
              >
                <option value="">Não informar (Manter na Sede / Almoxarifado)</option>
                {worksites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.code} — {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ── CAMPO 4: PREVISÃO DE DEVOLUÇÃO ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="returnDate">Previsão de Devolução (Opcional)</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="returnTime">Hora de Devolução</Label>
                <Input
                  id="returnTime"
                  type="time"
                  value={expectedReturnTime}
                  onChange={(e) => setExpectedReturnTime(e.target.value)}
                  disabled={!expectedReturnDate}
                  className="mt-1.5 h-12"
                />
              </div>
            </div>

            {/* ── CAMPO 5: OBSERVAÇÕES ── */}
            <div>
              <Label htmlFor="notes">Observações de Saída (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Descreva o estado do item ao retirar ou qualquer instrução específica..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                rows={3}
                className="mt-1.5 resize-none"
              />
            </div>

            {/* ── BOTÃO SUBMISSÃO ── */}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full font-bold shadow-lg shadow-brand-accent/20"
              disabled={isSubmitting || !selectedAsset || !selectedEmployee}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gravando empréstimo...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Autorizar Saída de Patrimônio
                </>
              )}
            </Button>
          </form>
        )
      )}
    </div>
  )
}
