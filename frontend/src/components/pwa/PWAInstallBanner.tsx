// src/components/pwa/PWAInstallBanner.tsx
// Banner de instalação PWA — aparece automaticamente quando disponível.
// Adapta a mensagem para Android (prompt nativo) ou iOS (instruções manuais).

import { useState } from 'react'
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePWA } from '@/hooks/usePWA'

// ── Banner para iOS (instrução manual de "Adicionar à Tela Inicial") ──────────

function IOSInstallGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Instalar app no iPhone ou iPad"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[300]',
        'bg-white border-t border-gray-200 shadow-2xl',
        'px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
        'animate-slide-up',
      )}
    >
      {/* Handle */}
      <div className="flex justify-center mb-3">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Ícone do app */}
          <img
            src="/icons/apple-touch-icon.png"
            alt="3T Gestão"
            className="w-14 h-14 rounded-2xl shadow-md flex-shrink-0 border border-gray-100"
          />
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight">
              Instalar 3T Gestão
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Adicione à tela inicial para acesso rápido sem o browser
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 flex-shrink-0 -mt-1 -mr-1"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Passos iOS */}
      <div className="mt-4 space-y-2.5 bg-slate-50 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
          Como instalar no iPhone / iPad:
        </p>
        <Step num={1} icon={Share} text='Toque no ícone de Compartilhar (▢↑) na barra inferior do Safari' />
        <Step num={2} icon={PlusSquare} text='Selecione "Adicionar à Tela de Início"' />
        <Step num={3} icon={Smartphone} text='Confirme tocando em "Adicionar" — o app aparecerá na sua tela inicial!' />
      </div>

      <button
        onClick={onDismiss}
        className="mt-4 w-full h-11 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold
                   hover:bg-gray-200 transition-colors"
      >
        Entendido
      </button>
    </div>
  )
}

function Step({
  num,
  icon: Icon,
  text,
}: {
  num: number
  icon: React.ElementType
  text: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {num}
      </div>
      <Icon size={16} className="text-brand-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-700 leading-snug">{text}</p>
    </div>
  )
}

// ── Banner Android/Desktop (prompt nativo) ────────────────────────────────────

function AndroidInstallBanner({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="banner"
      aria-label="Instalar app 3T Gestão"
      className={cn(
        'fixed bottom-4 left-4 right-4 z-[300] max-w-md mx-auto',
        'bg-white rounded-2xl shadow-2xl border border-gray-100',
        'px-4 py-4 animate-slide-up',
      )}
    >
      <div className="flex items-center gap-3">
        <img
          src="/icons/icon-192.png"
          alt="3T Gestão"
          className="w-12 h-12 rounded-xl flex-shrink-0 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">
            Instalar 3T Gestão
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Acesse o sistema diretamente pela tela inicial do seu celular
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 flex-shrink-0"
          aria-label="Dispensar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onDismiss}
          className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-500
                     font-semibold hover:bg-gray-50 transition-colors"
        >
          Agora não
        </button>
        <button
          onClick={onInstall}
          className="flex-1 h-10 rounded-xl bg-brand-primary text-white text-sm
                     font-bold flex items-center justify-center gap-2
                     hover:bg-brand-primary-hover transition-colors shadow-sm"
        >
          <Download size={15} />
          Instalar
        </button>
      </div>
    </div>
  )
}

// ── Banner de Atualização Disponível ─────────────────────────────────────────

function UpdateBanner({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed top-20 left-4 right-4 z-[300] max-w-md mx-auto',
        'bg-brand-primary text-white rounded-2xl shadow-2xl',
        'px-4 py-3 flex items-center gap-3 animate-slide-down',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">Nova versão disponível!</p>
        <p className="text-xs text-white/70 mt-0.5">Atualize para obter as últimas melhorias.</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
        aria-label="Ignorar atualização"
      >
        <X size={15} />
      </button>
      <button
        onClick={onUpdate}
        className="px-3 h-9 rounded-xl bg-brand-accent text-white text-xs font-bold
                   hover:bg-brand-accent-dark transition-colors flex-shrink-0 whitespace-nowrap"
      >
        Atualizar
      </button>
    </div>
  )
}

// ── Componente Raiz ───────────────────────────────────────────────────────────

/**
 * PWAInstallBanner — orquestra todos os banners PWA.
 * Deve ser montado na raiz da aplicação, fora do layout principal.
 *
 * Lógica de exibição:
 * 1. Atualização disponível → UpdateBanner (prioridade máxima)
 * 2. iOS + não instalado + não dispensado → IOSInstallGuide
 * 3. Android/Desktop + canInstall + não dispensado → AndroidInstallBanner
 */
export function PWAInstallBanner() {
  const { updateAvailable, canInstall, isInstalled, isIOS, promptInstall, applyUpdate } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  // iOS: só mostra se não instalado, não dispensado e no Safari
  const showIOSGuide =
    isIOS &&
    !isInstalled &&
    !dismissed &&
    // Só mostra no Safari (não em browsers embutidos do iOS)
    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)

  if (!updateDismissed && updateAvailable) {
    return <UpdateBanner onUpdate={applyUpdate} onDismiss={() => setUpdateDismissed(true)} />
  }

  if (!dismissed && canInstall) {
    return (
      <AndroidInstallBanner
        onInstall={async () => {
          const result = await promptInstall()
          if (result === 'dismissed') setDismissed(true)
        }}
        onDismiss={() => setDismissed(true)}
      />
    )
  }

  if (showIOSGuide) {
    return <IOSInstallGuide onDismiss={() => setDismissed(true)} />
  }

  return null
}
