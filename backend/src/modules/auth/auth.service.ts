// src/modules/auth/auth.service.ts
// Lógica de negócio da autenticação — completamente desacoplada do Fastify.
// Pode ser testada unitariamente sem levantar o servidor.

import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../lib/env.js'
import type { LoginBody, UserPublic, ChangePasswordBody } from './auth.schema.js'

// ── Erros tipados do domínio ──────────────────────────────────────────────────

export class InvalidCredentialsError extends Error {
  readonly statusCode = 401
  constructor() {
    super('E-mail ou senha incorretos.')
    this.name = 'InvalidCredentialsError'
  }
}

export class InactiveUserError extends Error {
  readonly statusCode = 403
  constructor() {
    super(
      'Conta desativada. Entre em contato com o administrador do sistema.',
    )
    this.name = 'InactiveUserError'
  }
}

export class InvalidCurrentPasswordError extends Error {
  readonly statusCode = 400
  constructor() {
    super('A senha atual está incorreta.')
    this.name = 'InvalidCurrentPasswordError'
  }
}

// ── Seletor reutilizável (evita buscar passwordHash desnecessariamente) ────────

const userPublicSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  employee: {
    select: {
      id: true,
      fullName: true,
      registration: true,
      position: true,
      cpf: true,
      worksiteId: true,
      worksite: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
} as const

// ── Service ───────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Valida as credenciais e retorna o usuário público + hash para assinatura do JWT.
   * Lança `InvalidCredentialsError` ou `InactiveUserError` em caso de falha.
   */
  async validateCredentials(body: LoginBody): Promise<{
    user: UserPublic
    passwordHash: string
  }> {
    // 1. Busca o usuário pelo e-mail (inclui hash para comparação)
    const record = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        ...userPublicSelect,
        passwordHash: true,
      },
    })

    // Usuário não encontrado — erro genérico para não revelar qual campo falhou
    if (!record) {
      throw new InvalidCredentialsError()
    }

    // 2. Verifica se a conta está ativa
    if (!record.isActive) {
      throw new InactiveUserError()
    }

    // 3. Compara a senha com o hash (timing-safe via bcryptjs)
    const passwordMatch = await bcrypt.compare(body.password, record.passwordHash)

    if (!passwordMatch) {
      throw new InvalidCredentialsError()
    }

    // 4. Separa o hash do restante antes de retornar
    const { passwordHash, ...user } = record

    return { user, passwordHash }
  },

  /**
   * Retorna os dados públicos do usuário autenticado pelo ID (rota /auth/me).
   * Retorna null se o usuário não existe mais ou foi desativado.
   */
  async findById(userId: string): Promise<UserPublic | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: userPublicSelect,
    })

    return user ?? null
  },

  /**
   * Cria o hash de uma senha em texto plano.
   * Utilitário usado no seed e no futuro endpoint de criação de usuário.
   */
  async hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, env.BCRYPT_SALT_ROUNDS)
  },

  /**
   * Altera a senha do usuário autenticado após validação da senha atual.
   */
  async changePassword(userId: string, body: ChangePasswordBody): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { passwordHash: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado ou inativo.')
    }

    const passwordMatch = await bcrypt.compare(body.currentPassword, user.passwordHash)

    if (!passwordMatch) {
      throw new InvalidCurrentPasswordError()
    }

    const newPasswordHash = await bcrypt.hash(body.newPassword, env.BCRYPT_SALT_ROUNDS)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })
  },
}
