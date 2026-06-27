// src/pages/auth/ProfilePage.tsx
// Tela de visualização do Perfil do usuário e Alteração de Senha.

import React, { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Shield,
  FileText,
  Briefcase,
  MapPin,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LockKeyhole,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authApi, type ApiUser } from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  COLLABORATOR: 'Colaborador',
}

const ROLE_BADGE_VARIANTS: Record<string, 'default' | 'brand' | 'critical'> = {
  ADMIN: 'critical',
  MANAGER: 'brand',
  COLLABORATOR: 'default',
}

function formatCPF(cpf?: string) {
  if (!cpf) return '-'
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) return cpf
  return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Real-time validations
  const isPasswordValid = newPassword.length >= 8
  const doPasswordsMatch = newPassword === confirmPassword
  const canSubmit = currentPassword && isPasswordValid && doPasswordsMatch

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    authApi.me()
      .then(({ user }) => {
        if (active) {
          setProfile(user)
          setLoading(false)
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message ?? 'Falha ao carregar os dados do perfil.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setFormSuccess('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err)
      setFormError(err?.message ?? 'Ocorreu um erro ao tentar alterar sua senha.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm text-gray-500 font-medium">Carregando informações do perfil...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Erro ao carregar perfil</h3>
        <p className="text-sm text-gray-500 mb-4">{error ?? 'Não foi possível carregar as informações.'}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  const { employee } = profile
  const userInitials = employee?.fullName
    ? employee.fullName
        .split(' ')
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : profile.email[0].toUpperCase()

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-gray-500">Visualize seus dados de colaborador e gerencie suas credenciais de acesso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Account details & Employee details */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-brand-primary to-brand-primary-hover px-6 py-8 relative">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 text-white text-2xl font-bold shadow-md">
                  {userInitials}
                </div>
                <div className="text-center sm:text-left text-white">
                  <h2 className="text-xl font-bold leading-tight">{employee?.fullName ?? 'Usuário do Sistema'}</h2>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                    <span className="text-white/80 text-sm flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {profile.email}
                    </span>
                    <span className="text-white/40">•</span>
                    <Badge variant={ROLE_BADGE_VARIANTS[profile.role] ?? 'default'} className="bg-white/25 text-white ring-white/10">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                Dados do Colaborador
              </h3>

              {employee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Nome Completo */}
                  <div className="border-b border-gray-50 pb-3">
                    <span className="block text-xs font-semibold text-gray-400">Nome Completo</span>
                    <span className="text-sm font-medium text-gray-900">{employee.fullName}</span>
                  </div>

                  {/* Matrícula */}
                  <div className="border-b border-gray-50 pb-3">
                    <span className="block text-xs font-semibold text-gray-400">Matrícula</span>
                    <span className="text-sm font-medium text-gray-900">{employee.registration}</span>
                  </div>

                  {/* Cargo */}
                  <div className="border-b border-gray-50 pb-3 flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">Cargo / Função</span>
                      <span className="text-sm font-medium text-gray-900">{employee.position}</span>
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="border-b border-gray-50 pb-3 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">CPF</span>
                      <span className="text-sm font-medium text-gray-900">{formatCPF(employee.cpf)}</span>
                    </div>
                  </div>

                  {/* Obra Atual */}
                  <div className="md:col-span-2 border-b border-gray-50 pb-3 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-gray-400">Obra Atual Lotada</span>
                      {employee.worksite ? (
                        <div className="text-sm font-medium text-gray-900">
                          <Badge variant="brand" className="mr-2">
                            {employee.worksite.code}
                          </Badge>
                          {employee.worksite.name}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Nenhuma obra atribuída</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                  <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Esta conta não possui cadastro de colaborador físico vinculado.</p>
                  <p className="text-xs text-gray-400 mt-1">Geralmente contas administrativas de sistema não possuem vínculo direto com obras ou folha.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                  <LockKeyhole className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Segurança da Conta</CardTitle>
                  <CardDescription>Altere sua senha de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {formSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Sucesso!</span> {formSuccess}
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 flex items-start gap-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Erro:</span> {formError}
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    icon={<Lock className="w-4 h-4" />}
                  />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    required
                    icon={<Key className="w-4 h-4" />}
                    error={
                      newPassword && !isPasswordValid
                        ? 'A nova senha deve ter pelo menos 8 caracteres.'
                        : undefined
                    }
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    icon={<Key className="w-4 h-4" />}
                    error={
                      confirmPassword && !doPasswordsMatch
                        ? 'As senhas não coincidem.'
                        : undefined
                    }
                  />
                </div>

                {/* Password Strength Checklist */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                  <span className="font-bold text-gray-500 block">Requisitos de Segurança:</span>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className={isPasswordValid ? 'text-emerald-500' : 'text-gray-300'}>✓</span>
                    <span className={isPasswordValid ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      Mínimo de 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className={doPasswordsMatch && newPassword ? 'text-emerald-500' : 'text-gray-300'}>✓</span>
                    <span className={doPasswordsMatch && newPassword ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      Confirmação correspondente
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Alterando Senha...
                    </>
                  ) : (
                    'Salvar Nova Senha'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
