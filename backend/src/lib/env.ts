// src/lib/env.ts
// Valida e exporta as variáveis de ambiente obrigatórias.
// A aplicação falha imediatamente (fail-fast) se alguma estiver ausente.

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Servidor
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),

  // Banco de dados
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida.'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // CORS — lista separada por vírgula ou string única
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
})

const _parsed = envSchema.safeParse(process.env)

if (!_parsed.success) {
  console.error(
    '❌  Variáveis de ambiente inválidas ou ausentes:\n',
    _parsed.error.flatten().fieldErrors,
  )
  process.exit(1)
}

export const env = _parsed.data

/** Lista de origens CORS parseada a partir de CORS_ORIGIN */
export const corsOrigins: string[] = env.CORS_ORIGIN.split(',').map((o) =>
  o.trim(),
)
