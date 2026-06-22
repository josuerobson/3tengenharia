// src/app.ts
// Factory da instância Fastify — configura todos os plugins e registra as rotas.
// Exportada como função para facilitar testes de integração (sem `listen`).

import Fastify from 'fastify'
import { corsPlugin } from './plugins/cors.js'
import { jwtPlugin } from './plugins/jwt.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { authRoutes }              from './modules/auth/auth.routes.js'
import { vehicleRoutes }           from './modules/vehicles/vehicles.routes.js'
import { maintenanceTypeRoutes }   from './modules/vehicles/maintenanceTypes.routes.js'
import { assetRoutes }             from './modules/assets/assets.routes.js'
import { timeLogRoutes }           from './modules/time-logs/time-logs.routes.js'
import { fiveSRoutes }             from './modules/fiveS/fiveS.routes.js'
import { env } from './lib/env.js'

export async function buildApp() {
  const app = Fastify({
    // Logger estruturado (pino) — formatado para humanos em dev, JSON em prod
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname',
              },
            },
          }
        : true,

    // Ignora a diferença de trailing slash nas rotas (ex: /login e /login/ são a mesma)
    ignoreTrailingSlash: true,

    // Tempo máximo de resposta — 30s (aumentar apenas para uploads)
    requestTimeout: 30_000,

    // Tamanho máximo do body — 10 MB (para upload de foto de defeito no módulo 2)
    bodyLimit: 10 * 1024 * 1024,

    // Confia no X-Forwarded-* headers quando atrás de um proxy reverso (Nginx/Caddy)
    trustProxy: true,

    // Configura o AJV para aceitar keywords do OpenAPI/Swagger usadas nos schemas
    // das rotas (tags, summary, description, security, example) sem lançar erro
    // de strict mode. Esses campos são apenas documentação e não afetam validação.
    ajv: {
      customOptions: {
        strict: false,
        allowUnionTypes: true,
      },
    },
  })

  // ── Plugins de infraestrutura (ordem importa) ─────────────────────────────
  await app.register(corsPlugin)        // 1. CORS antes de qualquer rota
  await app.register(jwtPlugin)         // 2. JWT — adiciona decorators
  await app.register(errorHandlerPlugin) // 3. Error handler global

  // ── Rotas de saúde / health check (sem prefixo de versão) ────────────────
  app.get('/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    })
  })

  // ── Módulos de negócio (prefixo /api/v1) ──────────────────────────────────
  await app.register(
    async (v1) => {
      await v1.register(authRoutes,             { prefix: '/auth' })       // Módulo: Autenticação
      await v1.register(vehicleRoutes,          { prefix: '/vehicles' })   // Módulo 1: Veículos
      await v1.register(maintenanceTypeRoutes,  { prefix: '/vehicles' })   // Módulo 1: Tipos de manutenção
      await v1.register(assetRoutes,            { prefix: '/assets' })     // Módulo 2: Patrimônio
      await v1.register(timeLogRoutes,          { prefix: '/time-logs' })  // Módulo 3: Horas
      await v1.register(fiveSRoutes,            { prefix: '/5s' })         // Módulo 5S: Auditorias
    },
    { prefix: '/api/v1' },
  )

  return app
}
