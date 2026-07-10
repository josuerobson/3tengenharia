// src/components/layout/DashboardLayout.tsx
// Layout base do dashboard — orquestra o estado de colapso/drawer e
// distribui o espaço entre Header, Sidebar e conteúdo principal.
//
// Estrutura de posicionamento (fixed):
//   ┌─────────────────── Header (h-16, z-50) ──────────────────────────────┐
//   │ Logo | Collapse | … | Notificações | Perfil                          │
//   ├──── Sidebar ────┬────────── Main Content ──────────────────────────  │
//   │  (fixed, z-40)  │  (pt-16 + pl-sidebar, overflow-y-auto)             │
//   │                 │                                                     │
//   │  Navegação      │  {children}                                        │
//   │                 │                                                     │
//   └─────────────────┴─────────────────────────────────────────────────── ┘

import React, { useState, useCallback } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { cn } from '@/lib/utils'

export interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Estado de colapso da sidebar no desktop (true = 70px, false = 256px)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

  // Estado do drawer mobile (true = visível, false = oculto)
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false)

  const handleDesktopCollapseToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  const handleMobileOpen = useCallback(() => {
    setIsMobileOpen(true)
  }, [])

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header fixo no topo ─────────────────────────────────────────── */}
      <Header
        isCollapsed={isCollapsed}
        onMobileMenuToggle={handleMobileOpen}
        onDesktopCollapseToggle={handleDesktopCollapseToggle}
      />

      {/* ── Sidebar (desktop fixed + mobile drawer) ─────────────────────── */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCollapsedChange={setIsCollapsed}
        onMobileClose={handleMobileClose}
      />

      {/* ── Área de Conteúdo Principal ──────────────────────────────────── */}
      {/*
          pt-[...]  → compensa o Header fixo de 64px + safe-area do notch/Dynamic Island (PWA iOS)
          lg:pl-64  → compensa a sidebar expandida (256px)
          lg:pl-[70px] → compensa a sidebar colapsada (70px)
          A transição de padding-left é sincronizada com a largura da sidebar.
      */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'pt-[calc(4rem+env(safe-area-inset-top))] min-h-screen',
          isCollapsed ? 'lg:pl-[70px]' : 'lg:pl-64',
        )}
      >
        <main
          id="main-content"
          className="p-4 sm:p-5 lg:p-6 min-h-[calc(100vh-4rem-env(safe-area-inset-top))]"
          // Acessibilidade: âncora para "skip to content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
