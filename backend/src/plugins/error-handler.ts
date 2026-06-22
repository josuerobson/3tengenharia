// src/plugins/error-handler.ts
// Tratamento global de erros — normaliza todas as exceções para um formato JSON
// consistente e seguro (não vaza stack traces em produção).

import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import type { FastifyInstance } from 'fastify'
import { env } from '../lib/env.js'

/** Shape padrão de erro retornado pela API */
export interface ApiError {
  statusCode: number
  error: string
  message: string
  issues?: Record<string, string[]> // apenas em erros de validação Zod
}

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    // ── Erros de validação Zod (schemas de request) ──────────────────────────
    if (error instanceof ZodError) {
      const issues: Record<string, string[]> = {}

      for (const issue of error.issues) {
        const key = issue.path.join('.') || 'root'
        if (!issues[key]) issues[key] = []
        issues[key]!.push(issue.message)
      }

      return reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Dados de entrada inválidos.',
        issues,
      } satisfies ApiError)
    }

    // ── Erros do @fastify/jwt (401) ───────────────────────────────────────────
    if (
      error.name === 'UnauthorizedError' ||
      error.statusCode === 401 ||
      // @fastify/jwt lança com essa mensagem em alguns cenários
      error.message?.toLowerCase().includes('jwt')
    ) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error.message ?? 'Não autorizado.',
      } satisfies ApiError)
    }

    // ── Erros de validação do Fastify (JSON Schema nativo) ───────────────────
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message ?? 'Requisição inválida.',
      } satisfies ApiError)
    }

    // ── Erros conhecidos com statusCode explícito (lançados pela aplicação) ──
    const knownStatus =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : null

    if (knownStatus) {
      return reply.status(knownStatus).send({
        statusCode: knownStatus,
        error: error.name ?? 'Error',
        message: error.message,
      } satisfies ApiError)
    }

    // ── Erros inesperados (500) ───────────────────────────────────────────────
    // Em produção, não exponha detalhes internos ao cliente.
    app.log.error(
      {
        err: error,
        request: {
          method: request.method,
          url: request.url,
          ip: request.ip,
        },
      },
      'Erro interno não tratado',
    )

    const isProduction = env.NODE_ENV === 'production'

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: isProduction
        ? 'Ocorreu um erro interno. Tente novamente mais tarde.'
        : error.message,
    } satisfies ApiError)
  })

  // 404 — rota não encontrada
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Rota não encontrada: ${request.method} ${request.url}`,
    } satisfies ApiError)
  })
})
