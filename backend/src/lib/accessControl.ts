// src/lib/accessControl.ts
// Registro central do sistema de perfis de acesso dinâmicos.
// pageKey é a chave fixa que protege cada rota — a lista de páginas válidas
// vive aqui, não é texto livre configurável pelo gestor.

import { AccessLevel } from '@prisma/client'

/** ID fixo do perfil administrador raiz — imutável, indeletável, bypass total. */
export const MASTER_ADMIN_PROFILE_ID = 'profile_admin_master'

export interface PageDefinition {
  key: string
  label: string
  group: string
  /** Se true, oferece os 4 níveis (inclui *_OWN). Se false, só NONE/READ_ALL/WRITE_ALL. */
  supportsOwnScope: boolean
}

export const PAGE_DEFINITIONS: PageDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Geral', supportsOwnScope: false },

  { key: 'vehicles.trips.new', label: 'Nova Viagem', group: 'Controle de Veículos', supportsOwnScope: true },
  { key: 'vehicles.trips.history', label: 'Histórico de Viagens', group: 'Controle de Veículos', supportsOwnScope: true },
  { key: 'vehicles.fleet', label: 'Cadastro de Veículos', group: 'Controle de Veículos', supportsOwnScope: false },
  { key: 'vehicles.maintenance.alerts', label: 'Alertas de Manutenção', group: 'Controle de Veículos', supportsOwnScope: false },
  { key: 'vehicles.maintenance.types', label: 'Tipos de Manutenção', group: 'Controle de Veículos', supportsOwnScope: false },

  { key: 'assets.catalog', label: 'Catálogo de Itens', group: 'Ferramentas & Equipamentos', supportsOwnScope: false },
  { key: 'assets.requests', label: 'Minhas Solicitações', group: 'Ferramentas & Equipamentos', supportsOwnScope: true },
  { key: 'assets.defect.new', label: 'Relatar Defeito', group: 'Ferramentas & Equipamentos', supportsOwnScope: false },
  { key: 'assets.warehouse.inventory', label: 'Almoxarifado > Estoque, Itens & Categorias', group: 'Ferramentas & Equipamentos', supportsOwnScope: false },
  { key: 'assets.warehouse.fulfillment', label: 'Almoxarifado > Atender Solicitações & Validar Devoluções', group: 'Ferramentas & Equipamentos', supportsOwnScope: false },
  { key: 'assets.warehouse.activeLoans', label: 'Almoxarifado > Empréstimos Ativos (legado)', group: 'Ferramentas & Equipamentos', supportsOwnScope: false },

  { key: 'timelogs.daily', label: 'Registro Diário', group: 'Rateio de Horas', supportsOwnScope: true },
  { key: 'timelogs.report', label: 'Relatório por C.C.', group: 'Rateio de Horas', supportsOwnScope: false },
  { key: 'timelogs.allocation', label: 'Alocar Equipes', group: 'Rateio de Horas', supportsOwnScope: false },
  { key: 'timelogs.teams', label: 'Equipes', group: 'Rateio de Horas', supportsOwnScope: false },

  { key: 'fiveS.audit.new', label: 'Nova Auditoria', group: 'Auditorias 5S', supportsOwnScope: true },
  { key: 'fiveS.panel', label: 'Painel de Qualidade', group: 'Auditorias 5S', supportsOwnScope: false },

  { key: 'admin.users', label: 'Usuários', group: 'Administração', supportsOwnScope: false },
  { key: 'admin.worksites', label: 'Cadastro de Obras', group: 'Administração', supportsOwnScope: false },
  { key: 'admin.accessControl', label: 'Controle de Acesso', group: 'Administração', supportsOwnScope: false },
]

export const PAGE_KEYS = PAGE_DEFINITIONS.map((p) => p.key)
const PAGE_KEY_SET = new Set(PAGE_KEYS)

export function isValidPageKey(key: string): boolean {
  return PAGE_KEY_SET.has(key)
}

export function getPageDefinition(key: string): PageDefinition | undefined {
  return PAGE_DEFINITIONS.find((p) => p.key === key)
}

// ── Helpers de nível de acesso ─────────────────────────────────────────────────

export function canRead(level: AccessLevel): boolean {
  return level !== 'NONE'
}

export function canWrite(level: AccessLevel): boolean {
  return level === 'WRITE_OWN' || level === 'WRITE_ALL'
}

export function isOwnScoped(level: AccessLevel): boolean {
  return level === 'READ_OWN' || level === 'WRITE_OWN'
}
