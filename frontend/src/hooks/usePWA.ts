// src/hooks/usePWA.ts
// Hook para registro do Service Worker e controle do prompt de instalação PWA.
// Compatível com Android (beforeinstallprompt) e iOS (detecção manual).

import { useState, useEffect, useCallback } from 'react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Estado completo do PWA no dispositivo */
export interface PWAState {
  /** Service Worker registrado com sucesso */
  swRegistered:    boolean
  /** Há uma atualização do SW disponível */
  updateAvailable: boolean
  /** O app pode ser instalado (Android/Desktop) */
  canInstall:      boolean
  /** O app já está instalado (em modo standalone) */
  isInstalled:     boolean
  /** Dispositivo iOS detectado (necessita fluxo diferente) */
  isIOS:           boolean
  /** Dispara o prompt nativo de instalação (Android/Desktop) */
  promptInstall:   () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  /** Aplica a atualização disponível do SW */
  applyUpdate:     () => void
}

// ── Detecção de ambiente ──────────────────────────────────────────────────────

function detectIsIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad com iPadOS 13+ reporta-se como MacIntel mas tem tela sensível ao toque
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function detectIsInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari quando adicionado à tela inicial
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// ── Hook Principal ────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const [swRegistered,    setSwRegistered]    = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swRegistration,  setSwRegistration]  = useState<ServiceWorkerRegistration | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [canInstall,    setCanInstall]    = useState(false)

  const isIOS       = detectIsIOS()
  const isInstalled = detectIsInstalled()

  // ── 1. Registra o Service Worker ────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Workers não suportados neste browser.')
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope)
        setSwRegistered(true)
        setSwRegistration(registration)

        // Verifica se já há um SW esperando (atualização disponível)
        if (registration.waiting) {
          setUpdateAvailable(true)
        }

        // Monitora futuras atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão do app disponível!')
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((error) => {
        console.error('[PWA] Falha ao registrar Service Worker:', error)
      })

    // Detecta quando o SW toma controle (após atualização)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  // ── 2. Captura o evento de instalação (Android / Desktop) ──────────────────
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne o mini-infobar nativo do Chrome (controlamos o timing)
      e.preventDefault()
      setInstallPrompt(e)
      setCanInstall(true)
      console.log('[PWA] Prompt de instalação disponível.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Detecta quando o usuário instala via prompt nativo
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalado pelo usuário!')
      setCanInstall(false)
      setInstallPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // ── 3. Dispara o prompt de instalação ──────────────────────────────────────
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!installPrompt) {
      console.warn('[PWA] Prompt de instalação não disponível.')
      return 'unavailable'
    }

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    console.log('[PWA] Usuário respondeu ao prompt:', outcome)
    if (outcome === 'accepted') {
      setCanInstall(false)
      setInstallPrompt(null)
    }

    return outcome as 'accepted' | 'dismissed'
  }, [installPrompt])

  // ── 4. Aplica a atualização do SW ──────────────────────────────────────────
  const applyUpdate = useCallback(() => {
    if (!swRegistration?.waiting) return

    // Envia mensagem SKIP_WAITING para o SW em espera assumir o controle
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [swRegistration])

  return {
    swRegistered,
    updateAvailable,
    canInstall,
    isInstalled,
    isIOS,
    promptInstall,
    applyUpdate,
  }
}
