// src/lib/prisma.ts
// Singleton do Prisma Client — garante uma única instância durante o ciclo de vida do servidor.
// Em dev (tsx watch), evita o acúmulo de conexões ao recriar o módulo.

import { PrismaClient } from '@prisma/client'

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  })
}

// Em ambientes de desenvolvimento com hot-reload, preservamos a instância no
// escopo global para evitar múltiplas conexões abertas ao banco.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
