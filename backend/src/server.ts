// src/server.ts
// Ponto de entrada da aplicação — chama buildApp() e inicia o servidor HTTP.
// Gerencia graceful shutdown para fechar o Prisma antes de encerrar o processo.

import { buildApp } from './app.js'
import { prisma } from './lib/prisma.js'
import { env } from './lib/env.js'

async function main(): Promise<void> {
  const app = await buildApp()

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  // Garante que conexões ativas sejam encerradas antes do processo terminar.
  // Essencial em ambientes de container (Docker/K8s) e PM2.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Sinal ${signal} recebido. Encerrando servidor...`)

    try {
      await app.close()        // Para de aceitar novas requisições
      await prisma.$disconnect() // Fecha o pool de conexões do banco
      app.log.info('Servidor encerrado com sucesso.')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Erro durante o shutdown.')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // ── Exceções não capturadas ────────────────────────────────────────────────
  process.on('uncaughtException', (err) => {
    app.log.fatal(err, 'Exceção não capturada — encerrando processo.')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ reason }, 'Promise rejeitada sem handler — encerrando processo.')
    process.exit(1)
  })

  // ── Inicia o servidor ──────────────────────────────────────────────────────
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    app.log.fatal(err, 'Falha ao iniciar o servidor.')
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
