// src/components/layout/Header.tsx
// Header fixo no topo com logo, hambúrguer (mobile), botão de colapso (desktop),
// central de notificações e menu do usuário com indicador de perfil RBAC.

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Menu,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Settings,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS, ROLE_HEADER_TEXT } from '@/types/auth'

// ── Dados mock de notificações (substituir por API na Etapa 5) ────────────────

type NotifType = 'warning' | 'error' | 'success' | 'info'

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: NotifType
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Alerta de Manutenção',
    message: 'Veículo ABC-1D23 atingiu o limiar de KM preventivo.',
    time: '5 min',
    type: 'warning',
    read: false,
  },
  {
    id: '2',
    title: 'Avaria Reportada',
    message: 'Patrimônio #PAT-0042 (Furadeira) foi reportado com defeito.',
    time: '1h',
    type: 'error',
    read: false,
  },
  {
    id: '3',
    title: 'Lançamentos Pendentes',
    message: '3 lançamentos de horas aguardam sua validação.',
    time: '2h',
    type: 'info',
    read: false,
  },
  {
    id: '4',
    title: 'Empréstimo Devolvido',
    message: 'Martelo rotativo #PAT-0018 foi devolvido por João Silva.',
    time: '3h',
    type: 'success',
    read: true,
  },
]

// ── Sub-componentes internos ──────────────────────────────────────────────────

/** Avatar com iniciais do nome do usuário */
function UserAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className={cn(
        'rounded-full bg-brand-accent flex items-center justify-center',
        'font-bold text-white select-none flex-shrink-0',
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

/** Ícone por tipo de notificação */
function NotifIcon({ type }: { type: NotifType }) {
  const configs: Record<NotifType, { icon: React.ElementType; className: string }> = {
    warning: { icon: AlertTriangle, className: 'text-amber-500 bg-amber-50' },
    error: { icon: X, className: 'text-red-500 bg-red-50' },
    success: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-50' },
    info: { icon: Info, className: 'text-brand-primary bg-brand-primary/10' },
  }
  const { icon: Icon, className } = configs[type]
  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', className)}>
      <Icon size={15} />
    </div>
  )
}

/** Painel de notificações (dropdown) */
function NotificationPanel({
  notifications,
  onMarkAllRead,
  onClose,
}: {
  notifications: Notification[]
  onMarkAllRead: () => void
  onClose: () => void
}) {
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="animate-slide-down absolute right-0 top-full mt-2.5 w-[340px] max-w-[calc(100vw-2rem)]
                    bg-white rounded-2xl shadow-dropdown border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 text-sm">Notificações</h3>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold
                             bg-brand-accent text-white rounded-full">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-brand-primary font-medium hover:text-brand-primary-hover
                       hover:underline transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Nenhuma notificação
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                notif.read
                  ? 'bg-white hover:bg-gray-50'
                  : 'bg-brand-primary/[0.03] hover:bg-brand-primary/[0.06]',
              )}
            >
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium leading-snug', notif.read ? 'text-gray-500' : 'text-gray-800')}>
                  {notif.title}
                </p>
                <p className="text-xs text-gray-400 leading-snug mt-0.5 line-clamp-2">
                  {notif.message}
                </p>
                <p className="text-[11px] text-gray-300 mt-1">há {notif.time}</p>
              </div>
              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-brand-accent mt-1.5 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 text-center">
        <button
          onClick={onClose}
          className="text-xs text-brand-primary font-semibold hover:underline transition-colors"
        >
          Ver central de notificações →
        </button>
      </div>
    </div>
  )
}

/** Menu dropdown do usuário */
function UserDropdownMenu({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth()

  const handleLogout = useCallback(() => {
    logout()
    onClose()
  }, [logout, onClose])

  return (
    <div className="animate-slide-down absolute right-0 top-full mt-2.5 w-56
                    bg-white rounded-2xl shadow-dropdown border border-gray-100 z-50 overflow-hidden">
      {/* User info header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
      </div>

      {/* Actions */}
      <div className="p-1.5 space-y-0.5">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-600
                           rounded-xl hover:bg-gray-50 hover:text-brand-primary transition-colors text-left">
          <User size={15} className="flex-shrink-0" />
          Meu Perfil
        </button>
        <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-600
                           rounded-xl hover:bg-gray-50 hover:text-brand-primary transition-colors text-left">
          <Settings size={15} className="flex-shrink-0" />
          Configurações
        </button>
      </div>

      {/* Logout */}
      <div className="p-1.5 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-500
                     rounded-xl hover:bg-red-50 transition-colors text-left"
        >
          <LogOut size={15} className="flex-shrink-0" />
          Sair da Conta
        </button>
      </div>
    </div>
  )
}

// ── Hook para fechar ao clicar fora ──────────────────────────────────────────

function useClickOutside(
  refs: React.RefObject<HTMLElement>[],
  handler: () => void,
) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      const outside = refs.every(
        (ref) => ref.current && !ref.current.contains(e.target as Node),
      )
      if (outside) handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [refs, handler])
}

// ── Header Principal ─────────────────────────────────────────────────────────

export interface HeaderProps {
  /** Estado de colapso da sidebar no desktop */
  isCollapsed: boolean
  /** Abre o drawer de navegação no mobile */
  onMobileMenuToggle: () => void
  /** Colapsa / expande a sidebar no desktop */
  onDesktopCollapseToggle: () => void
}

export default function Header({
  isCollapsed,
  onMobileMenuToggle,
  onDesktopCollapseToggle,
}: HeaderProps) {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const closeAll = useCallback(() => {
    setShowNotifications(false)
    setShowUserMenu(false)
  }, [])

  useClickOutside([notifRef as React.RefObject<HTMLElement>], () =>
    setShowNotifications(false),
  )
  useClickOutside([userMenuRef as React.RefObject<HTMLElement>], () =>
    setShowUserMenu(false),
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const firstName = user?.name?.split(' ')[0] ?? 'Usuário'

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 z-50
                 bg-brand-primary shadow-header
                 flex items-center"
      role="banner"
    >
      <div className="flex items-center w-full h-full px-3 sm:px-4 gap-1 sm:gap-2">

        {/* ── Hambúrguer (mobile apenas) ─────────────────────────────────── */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2.5 rounded-xl text-white/75 hover:text-white
                     hover:bg-white/10 active:bg-white/20 transition-all duration-150"
          aria-label="Abrir menu de navegação"
          aria-expanded={false}
          aria-controls="mobile-sidebar"
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        {/* ── Botão Colapso (desktop apenas) ────────────────────────────── */}
        <button
          onClick={onDesktopCollapseToggle}
          className="hidden lg:flex items-center justify-center p-2.5 rounded-xl
                     text-white/75 hover:text-white hover:bg-white/10
                     active:bg-white/20 transition-all duration-150"
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          title={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? (
            <ChevronRight size={20} strokeWidth={2} />
          ) : (
            <ChevronLeft size={20} strokeWidth={2} />
          )}
        </button>

        {/* ── Logomarca ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 ml-1">
          {/* Ícone 3T — sempre visível, versão compacta no mobile */}
          <img
            src="/icons/icon-192.png"
            alt="3T Engenharia"
            className="w-8 h-8 rounded-lg object-contain sm:hidden flex-shrink-0"
            loading="eager"
            onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              const fallback = t.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          {/* Fallback texto (oculto por padrão) */}
          <div
            style={{ display: 'none' }}
            className="w-8 h-8 bg-white/15 border border-white/20 rounded-lg
                       items-center justify-center sm:hidden"
          >
            <span className="text-white font-extrabold text-xs tracking-tight">3T</span>
          </div>

          {/* Logo horizontal completa — visível em sm+ */}
          <img
            src="/logo-sistema.png"
            alt="3T Engenharia — Sistema de Gestão"
            className="hidden sm:block h-8 w-auto max-w-[160px] object-contain"
            loading="eager"
            onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              const fallback = t.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'block'
            }}
          />
          {/* Fallback texto para logo horizontal */}
          <div className="hidden" style={{}}>
            <p className="text-white font-semibold text-sm leading-tight tracking-tight">
              3T Engenharia
            </p>
            <p className="text-white/50 text-[10px] leading-none font-normal mt-0.5 tracking-wide uppercase">
              Sistema de Gestão
            </p>
          </div>
        </div>


        {/* ── Espaço flexível ───────────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Controles à direita ───────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 sm:gap-1">

          {/* Central de Notificações */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev)
                setShowUserMenu(false)
              }}
              className="relative p-2.5 rounded-xl text-white/75 hover:text-white
                         hover:bg-white/10 active:bg-white/20 transition-all duration-150"
              aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} não lidas` : ''}`}
            >
              <Bell size={20} strokeWidth={2} />
              {/* Badge de contagem */}
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5
                             bg-brand-accent rounded-full flex items-center justify-center
                             text-[10px] font-bold text-white ring-2 ring-brand-primary
                             pointer-events-none"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* Divider sutil */}
          <div className="w-px h-7 bg-white/15 mx-1 hidden sm:block" aria-hidden="true" />

          {/* Perfil do Usuário */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu((prev) => !prev)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 py-1.5 pl-1 pr-2 rounded-xl
                         hover:bg-white/10 active:bg-white/20 transition-all duration-150"
              aria-label="Menu do usuário"
              aria-expanded={showUserMenu}
            >
              <UserAvatar name={user?.name ?? 'U'} className="w-8 h-8 text-[13px]" />

              {/* Nome + Role — oculto em mobile pequeno */}
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-white text-xs font-semibold leading-tight truncate max-w-[110px]">
                  {firstName}
                </p>
                <p
                  className={cn(
                    'text-[10px] leading-none mt-0.5 font-medium',
                    user ? ROLE_HEADER_TEXT[user.role] : 'text-white/60',
                  )}
                >
                  {user ? ROLE_LABELS[user.role] : ''}
                </p>
              </div>

              <ChevronDown
                size={13}
                strokeWidth={2.5}
                className={cn(
                  'text-white/50 transition-transform duration-200 flex-shrink-0',
                  showUserMenu && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {showUserMenu && <UserDropdownMenu onClose={closeAll} />}
          </div>
        </div>
      </div>
    </header>
  )
}
