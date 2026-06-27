// src/modules/worksites/worksites.service.ts
import { prisma } from '../../lib/prisma.js'
import type { CreateWorksiteBody, UpdateWorksiteBody } from './worksites.schema.js'

export class WorksiteNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Obra não encontrada: ${id}`)
    this.name = 'WorksiteNotFoundError'
  }
}

export class WorksiteCodeAlreadyExistsError extends Error {
  readonly statusCode = 409
  constructor(code: string) {
    super(`Código de obra já cadastrado: ${code}`)
    this.name = 'WorksiteCodeAlreadyExistsError'
  }
}

export class WorksiteHasRelationsError extends Error {
  readonly statusCode = 409
  constructor() {
    super(
      'Esta obra possui colaboradores lotados ou rateios de horas associados e não pode ser excluída. Inative-a se necessário.'
    )
    this.name = 'WorksiteHasRelationsError'
  }
}

export const worksitesService = {
  async list() {
    return prisma.worksite.findMany({
      orderBy: { code: 'asc' },
    })
  },

  async getById(id: string) {
    const worksite = await prisma.worksite.findUnique({
      where: { id },
    })
    if (!worksite) {
      throw new WorksiteNotFoundError(id)
    }
    return worksite
  },

  async create(body: CreateWorksiteBody) {
    const existing = await prisma.worksite.findUnique({
      where: { code: body.code },
    })
    if (existing) {
      throw new WorksiteCodeAlreadyExistsError(body.code)
    }

    return prisma.worksite.create({
      data: {
        code: body.code,
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        isActive: body.isActive ?? true,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    })
  },

  async update(id: string, body: UpdateWorksiteBody) {
    const worksite = await prisma.worksite.findUnique({
      where: { id },
    })
    if (!worksite) {
      throw new WorksiteNotFoundError(id)
    }

    if (body.code && body.code !== worksite.code) {
      const existing = await prisma.worksite.findUnique({
        where: { code: body.code },
      })
      if (existing) {
        throw new WorksiteCodeAlreadyExistsError(body.code)
      }
    }

    const data: any = {}
    if (body.code !== undefined) data.code = body.code
    if (body.name !== undefined) data.name = body.name
    if (body.address !== undefined) data.address = body.address
    if (body.city !== undefined) data.city = body.city
    if (body.state !== undefined) data.state = body.state
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null

    return prisma.worksite.update({
      where: { id },
      data,
    })
  },

  async delete(id: string) {
    const worksite = await prisma.worksite.findUnique({
      where: { id },
      include: {
        employees: { select: { id: true } },
        timeLogs: { select: { id: true } },
      },
    })
    if (!worksite) {
      throw new WorksiteNotFoundError(id)
    }

    if (worksite.employees.length > 0 || worksite.timeLogs.length > 0) {
      throw new WorksiteHasRelationsError()
    }

    await prisma.worksite.delete({
      where: { id },
    })
  },
}
