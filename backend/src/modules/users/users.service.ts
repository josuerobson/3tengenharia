// src/modules/users/users.service.ts
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import type { CreateUserBody, UpdateUserBody } from './users.schema.js'

export class UserNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Usuário não encontrado: ${id}`)
    this.name = 'UserNotFoundError'
  }
}

export class EmailAlreadyExistsError extends Error {
  readonly statusCode = 409
  constructor(email: string) {
    super(`E-mail já cadastrado: ${email}`)
    this.name = 'EmailAlreadyExistsError'
  }
}

export class EmployeeNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Colaborador não encontrado: ${id}`)
    this.name = 'EmployeeNotFoundError'
  }
}

export class EmployeeAlreadyLinkedError extends Error {
  readonly statusCode = 409
  constructor(fullName: string) {
    super(`Colaborador "${fullName}" já está vinculado a outro usuário.`)
    this.name = 'EmployeeAlreadyLinkedError'
  }
}

const SALT_ROUNDS = 12

export const usersService = {
  async list() {
    return prisma.user.findMany({
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            registration: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(body: CreateUserBody) {
    // 1. Validar e-mail único
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    })
    if (existingUser) {
      throw new EmailAlreadyExistsError(body.email)
    }

    // 2. Validar funcionário (se fornecido)
    if (body.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: body.employeeId },
      })
      if (!employee) {
        throw new EmployeeNotFoundError(body.employeeId)
      }
      if (employee.userId) {
        throw new EmployeeAlreadyLinkedError(employee.fullName)
      }
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    // 4. Inserir usuário
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: body.role,
        isActive: body.isActive ?? true,
      },
    })

    // 5. Vincular funcionário
    if (body.employeeId) {
      await prisma.employee.update({
        where: { id: body.employeeId },
        data: { userId: user.id },
      })
    }

    // Retorna com relacionamento atualizado
    return prisma.user.findUnique({
      where: { id: user.id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            registration: true,
            position: true,
          },
        },
      },
    })
  },

  async update(id: string, body: UpdateUserBody) {
    // 1. Verificar existência do usuário
    const user = await prisma.user.findUnique({
      where: { id },
      include: { employee: true },
    })
    if (!user) {
      throw new UserNotFoundError(id)
    }

    // 2. Validar e-mail único se alterado
    if (body.email && body.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      })
      if (existingUser) {
        throw new EmailAlreadyExistsError(body.email)
      }
    }

    // 3. Validar funcionário se alterado
    if (body.employeeId !== undefined && body.employeeId !== user.employee?.id) {
      if (body.employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { id: body.employeeId },
        })
        if (!employee) {
          throw new EmployeeNotFoundError(body.employeeId)
        }
        if (employee.userId && employee.userId !== id) {
          throw new EmployeeAlreadyLinkedError(employee.fullName)
        }
      }
    }

    // 4. Preparar data
    const updateData: any = {}
    if (body.email) updateData.email = body.email
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)
    }
    if (body.role) updateData.role = body.role
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // 5. Salvar atualizações do User
    await prisma.user.update({
      where: { id },
      data: updateData,
    })

    // 6. Gerenciar vínculos de Employee
    if (body.employeeId !== undefined && body.employeeId !== user.employee?.id) {
      // Desvincular anterior
      if (user.employee?.id) {
        await prisma.employee.update({
          where: { id: user.employee.id },
          data: { userId: null },
        })
      }
      // Vincular novo
      if (body.employeeId) {
        await prisma.employee.update({
          where: { id: body.employeeId },
          data: { userId: id },
        })
      }
    }

    return prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            registration: true,
            position: true,
          },
        },
      },
    })
  },

  async delete(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { employee: true },
    })
    if (!user) {
      throw new UserNotFoundError(id)
    }

    // 1. Desvincular funcionário
    if (user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: { userId: null },
      })
    }

    // 2. Excluir usuário
    await prisma.user.delete({
      where: { id },
    })
  },
}
