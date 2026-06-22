// src/plugins/cors.ts
// Plugin de CORS configurado para ambientes mobile-first / PWA.
// Suporta múltiplas origens e credentials para cookies/JWT no header Authorization.

import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { corsOrigins } from '../lib/env.js'

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    // Permite origens definidas em CORS_ORIGIN (env). Em produção, restrinja
    // explicitamente ao domínio do PWA/app.
    origin: (origin, callback) => {
      // Requisições sem origem (ex: curl, Postman, mobile nativo) são permitidas
      if (origin === undefined || origin === null) {
        return callback(null, true)
      }

      if (corsOrigins.includes(origin)) {
        return callback(null, true)
      }

      callback(new Error(`Origem bloqueada por CORS: ${origin}`), false)
    },

    // Necessário para que o cliente possa enviar o header Authorization
    credentials: true,

    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Headers que o cliente pode enviar
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],

    // Pré-vôo (preflight) em cache por 1 hora nos clientes
    maxAge: 3600,
  })
})
