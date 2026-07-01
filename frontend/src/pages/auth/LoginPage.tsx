// src/pages/auth/LoginPage.tsx
// Tela de login real — autenticação com backend via POST /auth/login.
// Implementa um design moderno, premium e responsivo alinhado com a identidade visual da 3T.

import { useState, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { KeyRound, User, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  // Estados locais
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se já estiver autenticado, redireciona para a raiz
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!email.trim() || !password.trim()) {
        setError('Por favor, preencha todos os campos.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await authApi.login({
          email: email.trim(),
          password: password,
        })
        
        // Salva estado global e tokens
        login(res.user, res.accessToken)
        
        // Redireciona para o dashboard
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credenciais inválidas.')
      } finally {
        setLoading(false)
      }
    },
    [email, password, login, navigate]
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002631] via-[#00475B] to-[#001c24] px-4 relative overflow-hidden">
      {/* Círculos decorativos de background */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-brand-primary/10 blur-[80px] -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-brand-accent/5 blur-[100px] -bottom-40 -right-40 pointer-events-none" />

      {/* Card de Login com Glassmorphism */}
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* Logo/Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto border border-white/15 shadow-inner">
            <span className="text-white font-black text-2xl tracking-tighter">3T</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Acesso</h1>
          <p className="text-sm text-gray-400">Sistema de Gestão Integrada — 3T Engenharia</p>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 animate-slide-down">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="text-xs font-medium">{error}</div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail ou CPF */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              E-mail ou CPF
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <Input
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@3tengenharia.com.br ou CPF"
                className="w-full bg-white/5 border-white/10 text-white placeholder-gray-500 pl-10 focus:border-brand-primary/50 focus:ring-brand-primary/20 rounded-xl"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Senha de acesso
              </Label>
              <a href="#" className="text-xs text-gray-400 hover:text-white hover:underline transition-colors">
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border-white/10 text-white placeholder-gray-500 pl-10 focus:border-brand-primary/50 focus:ring-brand-primary/20 rounded-xl"
              />
            </div>
          </div>

          {/* Botão de Entrar */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006880] hover:bg-[#005569] active:bg-[#00475B] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-cyan-900/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Acessar Sistema'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-white/5">
          <span>Desenvolvido por J4 Sistemas Operacionais</span>
        </div>
      </div>
    </div>
  )
}
