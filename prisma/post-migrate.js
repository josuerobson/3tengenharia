// prisma/post-migrate.js
import { PrismaClient } from '@prisma/client'

// ── Seed dos perfis de acesso de sistema ────────────────────────────────────
// Mantido em sincronia manual com backend/src/lib/accessControl.ts (PAGE_DEFINITIONS).
// Este arquivo roda a cada deploy via `db push` (que não executa migration.sql
// de dados), então a semeadura precisa viver aqui para acontecer automaticamente.

const FOUR_TIER_PAGE_KEYS = [
  'vehicles.trips.new',
  'vehicles.trips.history',
  'assets.requests',
  'timelogs.daily',
  'fiveS.audit.new',
]

const TWO_TIER_PAGE_KEYS = [
  'dashboard',
  'vehicles.fleet',
  'vehicles.maintenance.alerts',
  'vehicles.maintenance.types',
  'assets.catalog',
  'assets.defect.new',
  'assets.warehouse.inventory',
  'assets.warehouse.fulfillment',
  'assets.warehouse.activeLoans',
  'timelogs.report',
  'timelogs.allocation',
  'timelogs.teams',
  'fiveS.panel',
  'admin.users',
  'admin.worksites',
  'admin.accessControl',
]

const ALL_PAGE_KEYS = [...FOUR_TIER_PAGE_KEYS, ...TWO_TIER_PAGE_KEYS]

// Gestores (WORKSITE/HR/WAREHOUSE) são hoje indiferenciados no backend legado —
// todos os três têm acesso total às mesmas rotas. Reproduzido fielmente aqui.
const MANAGER_FULL_ACCESS = Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, 'WRITE_ALL']))

// Colaborador: nível "pessoal" nas páginas com dono claro; leitura ou nenhum
// acesso nas demais. Fecha algumas lacunas que hoje só não existem por falta
// de checagem no backend (ex: qualquer autenticado podia listar bens do
// almoxarifado via API mesmo sem a tela mostrar o botão) — ver aviso no chat.
const COLLABORATOR_ACCESS = {
  'vehicles.trips.new': 'WRITE_OWN',
  'vehicles.trips.history': 'WRITE_OWN',
  'assets.requests': 'WRITE_OWN',
  'timelogs.daily': 'WRITE_OWN',
  'fiveS.audit.new': 'WRITE_OWN',
  dashboard: 'READ_ALL',
  'vehicles.fleet': 'READ_ALL',
  'vehicles.maintenance.alerts': 'READ_ALL',
  'vehicles.maintenance.types': 'READ_ALL',
  'assets.catalog': 'READ_ALL',
  'assets.defect.new': 'WRITE_ALL',
  'assets.warehouse.inventory': 'NONE',
  'assets.warehouse.fulfillment': 'NONE',
  'assets.warehouse.activeLoans': 'NONE',
  'timelogs.report': 'NONE',
  'timelogs.allocation': 'NONE',
  'timelogs.teams': 'NONE',
  'fiveS.panel': 'NONE',
  'admin.users': 'NONE',
  'admin.worksites': 'NONE',
  'admin.accessControl': 'NONE',
}

const SYSTEM_PROFILES = [
  {
    id: 'profile_admin_master',
    name: 'Administrador',
    isMaster: true,
    isAdminType: true,
    permissions: null, // bypass total, não depende de linhas de permissão
    legacyRole: 'ADMIN',
  },
  {
    id: 'profile_collaborator',
    name: 'Colaborador',
    isMaster: false,
    isAdminType: false,
    permissions: COLLABORATOR_ACCESS,
    legacyRole: 'COLLABORATOR',
  },
  {
    id: 'profile_manager_worksite',
    name: 'Gestor de Obra',
    isMaster: false,
    isAdminType: false,
    permissions: MANAGER_FULL_ACCESS,
    legacyRole: 'MANAGER_WORKSITE',
  },
  {
    id: 'profile_manager_hr',
    name: 'Gestor de RH',
    isMaster: false,
    isAdminType: false,
    permissions: MANAGER_FULL_ACCESS,
    legacyRole: 'MANAGER_HR',
  },
  {
    id: 'profile_manager_warehouse',
    name: 'Gestor de Almoxarifado',
    isMaster: false,
    isAdminType: false,
    permissions: MANAGER_FULL_ACCESS,
    legacyRole: 'MANAGER_WAREHOUSE',
  },
]

async function seedAccessProfiles(prisma) {
  console.log('Semeando perfis de acesso de sistema...')

  for (const p of SYSTEM_PROFILES) {
    const profile = await prisma.accessProfile.upsert({
      where: { id: p.id },
      update: {}, // não sobrescreve customizações já feitas pelo gestor
      create: { id: p.id, name: p.name, isMaster: p.isMaster, isAdminType: p.isAdminType },
    })

    if (p.permissions) {
      for (const [pageKey, level] of Object.entries(p.permissions)) {
        await prisma.accessProfilePermission.upsert({
          where: { profileId_pageKey: { profileId: profile.id, pageKey } },
          update: {},
          create: { profileId: profile.id, pageKey, level },
        })
      }
    }
  }

  // Vincula usuários existentes (sem perfil ainda) ao perfil correspondente ao role legado
  for (const p of SYSTEM_PROFILES) {
    const result = await prisma.user.updateMany({
      where: { role: p.legacyRole, accessProfileId: null },
      data: { accessProfileId: p.id },
    })
    if (result.count > 0) {
      console.log(`Post-migration: vinculado(s) ${result.count} usuário(s) com role ${p.legacyRole} ao perfil "${p.name}".`)
    }
  }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Running post-migration: restoring admin master roles...')

    // 1. Promote admin@3tengenharia.com.br to ADMIN
    const updatedAdmin = await prisma.user.updateMany({
      where: {
        email: {
          equals: 'admin@3tengenharia.com.br',
          mode: 'insensitive'
        }
      },
      data: {
        role: 'ADMIN'
      }
    })

    // 2. Promote gestor@3tengenharia.com.br to ADMIN
    const updatedGestor = await prisma.user.updateMany({
      where: {
        email: {
          equals: 'gestor@3tengenharia.com.br',
          mode: 'insensitive'
        }
      },
      data: {
        role: 'ADMIN'
      }
    })

    console.log(`Post-migration: promoted ${updatedAdmin.count} admin user(s) and ${updatedGestor.count} gestor user(s) to ADMIN.`)

    await seedAccessProfiles(prisma)

    // 3. Garante que os dois usuários master também fiquem no perfil Administrador,
    // mesmo que já tivessem outro accessProfileId de um estado anterior (roda
    // incondicionalmente, ao contrário do backfill genérico acima que só
    // preenche quando accessProfileId ainda está nulo).
    await prisma.user.updateMany({
      where: {
        email: { in: ['admin@3tengenharia.com.br', 'gestor@3tengenharia.com.br'], mode: 'insensitive' },
      },
      data: { accessProfileId: 'profile_admin_master' },
    })
  } catch (err) {
    console.error('Post-migration error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
