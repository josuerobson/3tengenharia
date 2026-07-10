// src/components/RequirePage.tsx
// Guarda de rota baseada no sistema de perfis de acesso dinâmicos.
// Renderiza um bloqueio amigável em vez de deixar a página quebrar com
// erros 403 vindos do backend quando o perfil do usuário não tem acesso.

import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

function AccessDenied() {
  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card text-center p-8">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-gray-500">
          Seu perfil de acesso não tem permissão para visualizar esta página. Fale com um administrador se acredita que isso é um engano.
        </p>
      </div>
    </div>
  )
}

/** Um único pageKey, ou uma lista — visível se houver leitura em pelo menos uma. */
export default function RequirePage({
  pageKey,
  children,
}: {
  pageKey: string | string[]
  children: React.ReactNode
}) {
  const { canReadAny } = useAuth()
  const keys = Array.isArray(pageKey) ? pageKey : [pageKey]
  if (!canReadAny(keys)) {
    return <AccessDenied />
  }
  return <>{children}</>
}
