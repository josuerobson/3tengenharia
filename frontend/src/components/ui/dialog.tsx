// src/components/ui/dialog.tsx
// Dialog acessível usando React portals.
// Em mobile funciona como bottom-sheet; em sm+ como modal centralizado.

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Largura máxima no desktop. Padrão: max-w-lg */
  maxWidth?: string
  className?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'sm:max-w-lg',
  className,
}: DialogProps) {
  // 1. Trava o scroll do body quando aberto
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = parseInt(document.body.style.top || '0') * -1
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [open])

  // 2. Fecha ao pressionar Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel container */}
      <div className="fixed inset-0 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4 pointer-events-none">
        {/* Panel */}
        <div
          className={cn(
            // Mobile: bottom sheet
            'pointer-events-auto w-full',
            'bg-white rounded-t-3xl sm:rounded-2xl',
            'shadow-2xl',
            'max-h-[92dvh] overflow-y-auto scrollbar-thin',
            // Desktop: center modal with max-width
            maxWidth,
            // Animation: slide-up on mobile, scale-in on desktop
            'animate-slide-up sm:animate-scale-in',
            className,
          )}
        >
          {/* Handle bar (mobile visual) */}
          <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 sm:pt-5">
            <div className="flex-1 min-w-0 pr-3">
              <h2
                id="dialog-title"
                className="text-lg font-bold text-gray-900 leading-snug"
              >
                {title}
              </h2>
              {description && (
                <p
                  id="dialog-description"
                  className="text-sm text-gray-500 mt-0.5 leading-snug"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-1 rounded-xl text-gray-400 hover:text-gray-700
                         hover:bg-gray-100 transition-all duration-150 flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pb-6 sm:pb-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
