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

export class CpfAlreadyExistsError extends Error {
  readonly statusCode = 409
  constructor(cpf: string) {
    super(`CPF já cadastrado: ${cpf}`)
    this.name = 'CpfAlreadyExistsError'
  }
}

export class EmployeeNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Colaborador não encontrado: ${id}`)
    this.name = 'EmployeeNotFoundError'
  }
}

export class RegistrationAlreadyExistsError extends Error {
  readonly statusCode = 409
  constructor(registration: string) {
    super(`Matrícula já cadastrada: ${registration}`)
    this.name = 'RegistrationAlreadyExistsError'
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
            phone: true,
            cpf: true,
            cnhExpirationDate: true,
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

    // 2. Validar CPF único
    const existingCpf = await prisma.employee.findUnique({
      where: { cpf: body.cpf },
    })
    if (existingCpf) {
      throw new CpfAlreadyExistsError(body.cpf)
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

    // 5. Inserir Employee sob o capô
    const existingRegistration = await prisma.employee.findUnique({
      where: { registration: body.registration },
    })
    if (existingRegistration) {
      throw new RegistrationAlreadyExistsError(body.registration)
    }

    await prisma.employee.create({
      data: {
        userId: user.id,
        fullName: body.fullName,
        phone: body.phone,
        position: body.position,
        cpf: body.cpf,
        registration: body.registration,
        hireDate: new Date(),
        isActive: true,
        cnhExpirationDate: body.cnhExpirationDate ?? null,
      },
    })

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
            phone: true,
            cpf: true,
            cnhExpirationDate: true,
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

    // 3. Validar CPF único se alterado
    if (body.cpf && body.cpf !== user.employee?.cpf) {
      const existingCpf = await prisma.employee.findUnique({
        where: { cpf: body.cpf },
      })
      if (existingCpf) {
        throw new CpfAlreadyExistsError(body.cpf)
      }
    }

    // 3.1 Validar Matrícula única se alterada
    if (body.registration && body.registration !== user.employee?.registration) {
      const existingRegistration = await prisma.employee.findUnique({
        where: { registration: body.registration },
      })
      if (existingRegistration) {
        throw new RegistrationAlreadyExistsError(body.registration)
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

    // 6. Atualizar Employee
    const empData: any = {}
    if (body.fullName !== undefined) empData.fullName = body.fullName
    if (body.phone !== undefined) empData.phone = body.phone
    if (body.position !== undefined) empData.position = body.position
    if (body.cpf !== undefined) empData.cpf = body.cpf
    if (body.registration !== undefined) empData.registration = body.registration
    if (body.cnhExpirationDate !== undefined) empData.cnhExpirationDate = body.cnhExpirationDate
    
    if (Object.keys(empData).length > 0) {
      if (user.employee?.id) {
        await prisma.employee.update({
          where: { id: user.employee.id },
          data: empData,
        })
      } else {
        // Se por algum motivo o seed ou banco antigo não tiver employee para o user, cria
        let registration = ''
        while (true) {
          registration = 'MAT-' + Math.floor(100000 + Math.random() * 900000).toString()
          const existing = await prisma.employee.findUnique({ where: { registration } })
          if (!existing) break
        }
        await prisma.employee.create({
          data: {
            userId: id,
            fullName: body.fullName || 'Usuário Sem Nome',
            phone: body.phone || null,
            position: body.position || 'Função Não Definida',
            cpf: body.cpf || Math.floor(10000000000 + Math.random() * 90000000000).toString(),
            registration,
            isActive: true,
            hireDate: new Date(),
            cnhExpirationDate: body.cnhExpirationDate ?? null,
          },
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
            phone: true,
            cpf: true,
            cnhExpirationDate: true,
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
