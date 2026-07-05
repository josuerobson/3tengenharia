// src/lib/seed.ts
// Seed inicial do banco de dados — cria o usuário Administrador padrão.
// Execute com: npm run db:seed
// ATENÇÃO: Este script é idempotente (upsert), pode ser executado múltiplas vezes.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@3tengenharia.com.br'
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'Admin@3T2024!'
const SALT_ROUNDS = 12

async function seed(): Promise<void> {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // ── 1. Usuário Administrador ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},  // Não atualiza se já existir
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`✅ Usuário Admin: ${admin.email} (id: ${admin.id})`)

  // ── 2. Obra de exemplo ────────────────────────────────────────────────────
  const worksite = await prisma.worksite.upsert({
    where: { code: 'SEDE-001' },
    update: {},
    create: {
      code: 'SEDE-001',
      name: 'Sede Administrativa 3T',
      city: 'São Paulo',
      state: 'SP',
      isActive: true,
    },
  })

  console.log(`✅ Obra: ${worksite.name} (code: ${worksite.code})`)

  // ── 3. Gestor de exemplo ──────────────────────────────────────────────────
  const MANAGER_EMAIL = 'gestor@3tengenharia.com.br'
  const managerHash = await bcrypt.hash('Gestor@3T2024!', SALT_ROUNDS)

  const manager = await prisma.user.upsert({
    where: { email: MANAGER_EMAIL },
    update: {},
    create: {
      email: MANAGER_EMAIL,
      passwordHash: managerHash,
      role: 'MANAGER_WORKSITE',
      isActive: true,
      employee: {
        create: {
          cpf: '00000000001',
          registration: 'MAT-0001',
          fullName: 'Gestor Exemplo',
          position: 'Gestor de Obras',
          hireDate: new Date('2024-01-01'),
          worksiteId: worksite.id,
        },
      },
    },
    include: { employee: true },
  })

  console.log(`✅ Gestor: ${manager.email}`)

  console.log('\n────────────────────────────────────────')
  console.log('Credenciais de acesso inicial:')
  console.log(`  Admin  → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log(`  Gestor → ${MANAGER_EMAIL} / Gestor@3T2024!`)
  console.log('────────────────────────────────────────')
  console.log('\n⚠️  Altere as senhas após o primeiro login!\n')
}

seed()
  .catch((err) => {
    console.error('❌ Erro durante o seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
