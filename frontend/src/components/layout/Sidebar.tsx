// src/components/layout/Sidebar.tsx
// Sidebar responsiva com dois modos:
//   • Desktop: barra lateral fixa, colapsável (260px ↔ 70px), com accordion de submenus.
//   • Mobile:  drawer deslizante da esquerda, acionado pelo hambúrguer do Header.
//
// Comportamentos especiais:
//   • Sidebar colapsada + clique em item com submenus → expande automaticamente.
//   • Colapso → fecha todos os accordions abertos.
//   • Tooltip de hover nos ícones quando colapsada.
//   • Indicador de "filho ativo" (ponto laranja) quando colapsada e um submenu está ativo.

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  Wrench,
  Clock,
  Shield,
  ChevronRight,
  ChevronLeft,
  Plus,
  History,
  AlertTriangle,
  Package,
  ArrowLeftRight,
  AlertCircle,
  Warehouse,
  BookOpen,
  BarChart2,
  Users,
  Building2,
  Truck,
  X,
  ClipboardCheck,
  CheckSquare,
  ListChecks,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Definição de menus ────────────────────────────────────────────────────────

interface SubMenuItem {
  id: string
  label: string
  path: string
  icon: React.ElementType
}

interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  /** Quando definido, é um link direto sem accordion. */
  path?: string
  subItems?: SubMenuItem[]
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'vehicles',
    label: 'Controle de Veículos',
    icon: Car,
    subItems: [
      {
        id: 'vehicles-new',
        label: 'Nova Viagem',
        path: '/vehicles/trips/new',
        icon: Plus,
      },
      {
        id: 'vehicles-history',
        label: 'Histórico de Viagens',
        path: '/vehicles/trips',
        icon: History,
      },
      {
        id: 'vehicles-fleet',
        label: 'Cadastro de Veículos',
        path: '/vehicles/fleet',
        icon: Truck,
      },
      {
        id: 'vehicles-maintenance',
        label: 'Alertas de Manutenção',
        path: '/vehicles/maintenance',
        icon: AlertTriangle,
      },
      {
        id: 'vehicles-maintenance-types',
        label: 'Tipos de Manutenção',
        path: '/vehicles/maintenance-types',
        icon: Settings2,
      },
    ],
  },
  {
    id: 'assets',
    label: 'Ferramentas & Equipamentos',
    icon: Wrench,
    subItems: [
      {
        id: 'assets-catalog',
        label: 'Catálogo de Itens',
        path: '/assets/catalog',
        icon: Package,
      },
      {
        id: 'assets-loan',
        label: 'Solicitar bem',
        path: '/assets/loans/new',
        icon: ArrowLeftRight,
      },
      {
        id: 'assets-defect',
        label: 'Relatar Defeito',
        path: '/assets/maintenance/new',
        icon: AlertCircle,
      },
      {
        id: 'assets-warehouse',
        label: 'Almoxarifado',
        path: '/assets/warehouse',
        icon: Warehouse,
      },
    ],
  },
  {
    id: 'time-logs',
    label: 'Rateio de Horas',
    icon: Clock,
    subItems: [
      {
        id: 'timelogs-daily',
        label: 'Diário de Classe',
        path: '/time-logs/daily',
        icon: BookOpen,
      },
      {
        id: 'timelogs-report',
        label: 'Relatório por C.C.',
        path: '/time-logs/report',
        icon: BarChart2,
      },
      {
        id: 'timelogs-allocation',
        label: 'Alocar equipes',
        path: '/time-logs/team-allocation',
        icon: Users,
      },
    ],
  },
  {
    id: 'fiveS',
    label: 'Auditorias 5S',
    icon: ClipboardCheck,
    subItems: [
      {
        id: 'fiveS-audit-new',
        label: 'Nova Auditoria',
        path: '/5s/audit/new',
        icon: CheckSquare,
      },
      {
        id: 'fiveS-panel',
        label: 'Painel de Qualidade',
        path: '/5s/panel',
        icon: ListChecks,
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: Shield,
    subItems: [
      {
        id: 'admin-users',
        label: 'Usuários',
        path: '/admin/users',
        icon: Users,
      },
      {
        id: 'admin-worksites',
        label: 'Cadastro de Obras',
        path: '/admin/worksites',
        icon: Building2,
      },
    ],
  },
]

// ── Larguras da sidebar ───────────────────────────────────────────────────────

const SIDEBAR_EXPANDED_W = 'w-64'   // 256px
const SIDEBAR_COLLAPSED_W = 'w-[70px]'
const MOBILE_DRAWER_W = 'w-72'      // 288px

// ── Tooltip wrapper para ícones no modo colapsado ─────────────────────────────

function Tooltip({
  label,
  children,
  disabled,
}: {
  label: string
  children: ReactNode
  disabled: boolean
}) {
  if (disabled) return <>{children}</>

  return (
    <div className="relative group/tooltip">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60]
                   bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg
                   whitespace-nowrap shadow-xl
                   opacity-0 group-hover/tooltip:opacity-100
                   transition-opacity duration-150"
      >
        {label}
        {/* Caret à esquerda */}
        <span
          className="absolute right-full top-1/2 -translate-y-1/2
                     border-4 border-transparent border-r-gray-900"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

// ── Item de menu com accordion ────────────────────────────────────────────────

interface MenuItemComponentProps {
  item: MenuItem
  isCollapsed: boolean
  isOpen: boolean
  onToggle: (id: string) => void
}

function MenuItemComponent({
  item,
  isCollapsed,
  isOpen,
  onToggle,
}: MenuItemComponentProps) {
  const location = useLocation()

  /** Verifica se algum filho está ativo */
  const isChildActive =
    item.subItems?.some((sub) =>
      location.pathname.startsWith(sub.path),
    ) ?? false

  const isParentHighlighted = isChildActive || isOpen

  // ── Link direto (sem accordion) ───────────────────────────────────────────
  if (!item.subItems || item.subItems.length === 0) {
    return (
      <Tooltip label={item.label} disabled={!isCollapsed}>
        <NavLink
          to={item.path!}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-xl transition-all duration-150',
              'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              isCollapsed
                ? 'w-full justify-center py-2.5 px-2'
                : 'w-full gap-3 py-2.5 px-3',
              isActive
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-gray-500 hover:bg-brand-primary/10 hover:text-brand-primary',
            )
          }
        >
          <item.icon size={20} className="flex-shrink-0" strokeWidth={1.75} />

          {/* Texto — oculto quando colapsada */}
          <span
            className={cn(
              'text-sm font-medium whitespace-nowrap',
              'overflow-hidden transition-all duration-300 ease-in-out',
              isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100',
            )}
          >
            {item.label}
          </span>
        </NavLink>
      </Tooltip>
    )
  }

  // ── Botão de accordion (com submenus) ─────────────────────────────────────
  return (
    <div>
      <Tooltip label={item.label} disabled={!isCollapsed}>
        <button
          onClick={() => onToggle(item.id)}
          className={cn(
            'relative flex items-center w-full rounded-xl transition-all duration-150',
            'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
            isCollapsed
              ? 'justify-center py-2.5 px-2'
              : 'gap-3 py-2.5 px-3',
            isParentHighlighted && !isCollapsed
              ? 'text-brand-primary bg-brand-primary/8'
              : isParentHighlighted && isCollapsed
                ? 'text-brand-primary bg-brand-primary/10'
                : 'text-gray-500 hover:bg-brand-primary/10 hover:text-brand-primary',
          )}
          aria-expanded={isOpen}
          aria-controls={`submenu-${item.id}`}
        >
          {/* Ícone principal */}
          <item.icon size={20} className="flex-shrink-0" strokeWidth={1.75} />

          {/* Texto + Chevron de rotação (ocultos quando colapsada) */}
          <span
            className={cn(
              'flex flex-1 items-center justify-between min-w-0',
              'overflow-hidden transition-all duration-300 ease-in-out',
              isCollapsed ? 'w-0 opacity-0 ml-0' : 'ml-0 opacity-100',
            )}
          >
            <span className="text-sm font-medium whitespace-nowrap truncate">
              {item.label}
            </span>
            <ChevronRight
              size={15}
              strokeWidth={2.5}
              className={cn(
                'flex-shrink-0 ml-1 transition-transform duration-300 ease-in-out',
                isOpen ? 'rotate-90' : 'rotate-0',
              )}
              aria-hidden="true"
            />
          </span>

          {/* Ponto de filho ativo quando colapsada */}
          {isCollapsed && isChildActive && (
            <span
              className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-accent"
              aria-hidden="true"
            />
          )}
        </button>
      </Tooltip>

      {/* ── Conteúdo do Accordion ── */}
      <div
        id={`submenu-${item.id}`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          !isCollapsed && isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
        aria-hidden={!isOpen}
      >
        {/* Linha guia + itens */}
        <div className="ml-3.5 mt-1 mb-1 pl-4 border-l-2 border-gray-100 space-y-0.5">
          {item.subItems.map((sub) => (
            <NavLink
              key={sub.id}
              to={sub.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 py-2 px-3 rounded-lg text-[13px] transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
                  isActive
                    ? [
                        'text-brand-primary font-semibold',
                        'bg-brand-primary/8',
                        'border-l-[2.5px] border-brand-accent',
                        '-ml-[2px] pl-[10px]',
                      ]
                    : 'text-gray-500 hover:text-brand-primary hover:bg-brand-primary/5 font-medium',
                )
              }
            >
              <sub.icon size={14} className="flex-shrink-0" strokeWidth={2} />
              <span className="whitespace-nowrap truncate">{sub.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Conteúdo interno da Sidebar (compartilhado entre desktop e mobile) ────────

interface SidebarContentProps {
  isCollapsed: boolean
  isMobile: boolean
  onCollapsedChange: (v: boolean) => void
  onMobileClose: () => void
}

function SidebarContent({
  isCollapsed,
  isMobile,
  onCollapsedChange,
  onMobileClose,
}: SidebarContentProps) {
  const [openMenuIds, setOpenMenuIds] = useState<Set<string>>(new Set())
  // Ref para enfileirar abertura de accordion após expandir a sidebar
  const pendingOpenRef = useRef<string | null>(null)

  // Fecha todos os accordions quando a sidebar é colapsada
  useEffect(() => {
    if (isCollapsed && !isMobile) {
      setOpenMenuIds(new Set())
    }
  }, [isCollapsed, isMobile])

  // Quando a sidebar expande (isCollapsed false) com um item pendente, abre-o
  useEffect(() => {
    if (!isCollapsed && pendingOpenRef.current) {
      const id = pendingOpenRef.current
      pendingOpenRef.current = null
      setOpenMenuIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
  }, [isCollapsed])

  const handleToggle = useCallback(
    (id: string) => {
      // Se colapsada em desktop, expande primeiro, depois abre o accordion
      if (isCollapsed && !isMobile) {
        pendingOpenRef.current = id
        onCollapsedChange(false)
        return
      }
      setOpenMenuIds((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    },
    [isCollapsed, isMobile, onCollapsedChange],
  )

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">

      {/* ── Área da Marca ── */}
      {isMobile ? (
        /* Mobile: logo + botão de fechar */
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-sm tracking-tight">3T</span>
            </div>
            <div>
              <p className="text-brand-primary font-bold text-[15px] leading-tight">
                3T Engenharia
              </p>
              <p className="text-gray-400 text-[10px] leading-none mt-0.5 tracking-wide uppercase">
                Sistema de Gestão
              </p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700
                       hover:bg-gray-100 transition-all duration-150"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        /* Desktop: logo que reage ao colapso */
        <div
          className={cn(
            'flex items-center h-16 flex-shrink-0 border-b border-gray-100',
            'transition-all duration-300 ease-in-out',
            isCollapsed ? 'justify-center px-3' : 'px-4 gap-3',
          )}
        >
          <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-sm tracking-tight">3T</span>
          </div>

          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out min-w-0',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
            )}
          >
            <p className="text-brand-primary font-bold text-[15px] leading-tight whitespace-nowrap">
              3T Engenharia
            </p>
            <p className="text-gray-400 text-[10px] leading-none mt-0.5 tracking-wide uppercase whitespace-nowrap">
              Sistema de Gestão
            </p>
          </div>
        </div>
      )}

      {/* ── Navegação ── */}
      <nav
        className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5 space-y-0.5"
        aria-label="Navegação principal"
      >
        {MENU_ITEMS.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed && !isMobile}
            isOpen={openMenuIds.has(item.id)}
            onToggle={handleToggle}
          />
        ))}
      </nav>

      {/* ── Botão de Colapso (desktop only) ── */}
      {!isMobile && (
        <div className="flex-shrink-0 border-t border-gray-100 p-2.5">
          <button
            onClick={() => onCollapsedChange(!isCollapsed)}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl py-2 px-3',
              'text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10',
              'transition-all duration-150 text-sm font-medium',
              isCollapsed && 'justify-center px-2',
            )}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} strokeWidth={2} />
            ) : (
              <>
                <ChevronLeft size={18} strokeWidth={2} />
                <span
                  className={cn(
                    'whitespace-nowrap overflow-hidden transition-all duration-300',
                    isCollapsed ? 'w-0 opacity-0' : 'opacity-100',
                  )}
                >
                  Recolher menu
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente Sidebar Exportado ──────────────────────────────────────────────

export interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onMobileClose: () => void
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCollapsedChange,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP SIDEBAR — fixa, abaixo do header (top-16)
          Visível em lg+, completamente oculta em mobile
         ══════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          'hidden lg:block fixed top-16 left-0 bottom-0 z-40',
          'transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
        )}
        aria-label="Menu lateral"
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          isMobile={false}
          onCollapsedChange={onCollapsedChange}
          onMobileClose={onMobileClose}
        />
      </aside>

      {/* ══════════════════════════════════════════════════════
          MOBILE — Overlay + Drawer deslizante
         ══════════════════════════════════════════════════════ */}

      {/* Overlay escuro com blur */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50',
          'bg-gray-900/60 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-in-out',
          isMobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Drawer deslizante */}
      <aside
        id="mobile-sidebar"
        className={cn(
          'lg:hidden fixed top-0 left-0 bottom-0 z-50',
          MOBILE_DRAWER_W,
          'transition-transform duration-300 ease-in-out',
          'shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menu de navegação móvel"
        aria-modal="true"
        role="dialog"
      >
        <SidebarContent
          isCollapsed={false}
          isMobile={true}
          onCollapsedChange={onCollapsedChange}
          onMobileClose={onMobileClose}
        />
      </aside>
    </>
  )
}
