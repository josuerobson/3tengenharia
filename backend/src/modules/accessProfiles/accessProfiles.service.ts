// src/modules/accessProfiles/accessProfiles.service.ts

import { prisma } from '../../lib/prisma.js'
import { MASTER_ADMIN_PROFILE_ID, PAGE_DEFINITIONS, isValidPageKey } from '../../lib/accessControl.js'
import type { CreateAccessProfileBody, EditAccessProfileBody } from './accessProfiles.schema.js'

// ── Erros de domínio ──────────────────────────────────────────────────────────

export class AccessProfileNotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Perfil de acesso não encontrado: ${id}`)
    this.name = 'AccessProfileNotFoundError'
  }
}

export class AccessProfileNameAlreadyExistsError extends Error {
  readonly statusCode = 409
  constructor(name: string) {
    super(`Já existe um perfil de acesso chamado "${name}".`)
    this.name = 'AccessProfileNameAlreadyExistsError'
  }
}

export class CannotModifyMasterProfileError extends Error {
  readonly statusCode = 403
  constructor() {
    super('O perfil administrador raiz é imutável e não pode ser editado ou excluído.')
    this.name = 'CannotModifyMasterProfileError'
  }
}

export class OnlyAdminCanGrantAdminTypeError extends Error {
  readonly statusCode = 403
  constructor() {
    super('Somente um perfil administrador pode criar ou promover outro perfil administrador.')
    this.name = 'OnlyAdminCanGrantAdminTypeError'
  }
}

export class AccessProfileInUseError extends Error {
  readonly statusCode = 409
  constructor(name: string, count: number) {
    super(`Não é possível excluir "${name}": há ${count} usuário(s) vinculado(s) a este perfil.`)
    this.name = 'AccessProfileInUseError'
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Descarta silenciosamente páginas que não existem mais (ex: uma página removida
// do sistema que ainda está salva em perfis antigos). Isso evita que a edição de
// um perfil trave para sempre por causa de uma permissão órfã que o usuário nem
// tocou — a limpeza acontece sozinha na próxima vez que o perfil for salvo.
function filterValidPermissions<T extends { pageKey: string }>(permissions: T[]): T[] {
  return permissions.filter((p) => isValidPageKey(p.pageKey))
}

const profileInclude = {
  permissions: { select: { pageKey: true, level: true } },
  _count: { select: { users: true } },
} as const

// ── Service ───────────────────────────────────────────────────────────────────

export const accessProfilesService = {
  async listPages() {
    return PAGE_DEFINITIONS
  },

  async list() {
    return prisma.accessProfile.findMany({
      include: profileInclude,
      orderBy: [{ isMaster: 'desc' }, { isAdminType: 'desc' }, { name: 'asc' }],
    })
  },

  async create(body: CreateAccessProfileBody, requesterIsAdminType: boolean) {
    const validPermissions = filterValidPermissions(body.permissions)

    if (body.isAdminType && !requesterIsAdminType) {
      throw new OnlyAdminCanGrantAdminTypeError()
    }

    const existing = await prisma.accessProfile.findUnique({ where: { name: body.name } })
    if (existing) {
      throw new AccessProfileNameAlreadyExistsError(body.name)
    }

    return prisma.accessProfile.create({
      data: {
        name: body.name,
        isAdminType: body.isAdminType,
        permissions: {
          create: validPermissions.map((p) => ({ pageKey: p.pageKey, level: p.level })),
        },
      },
      include: profileInclude,
    })
  },

  async edit(id: string, body: EditAccessProfileBody, requesterIsAdminType: boolean) {
    const profile = await prisma.accessProfile.findUnique({ where: { id } })
    if (!profile) {
      throw new AccessProfileNotFoundError(id)
    }
    if (profile.isMaster) {
      throw new CannotModifyMasterProfileError()
    }

    const validPermissions = body.permissions ? filterValidPermissions(body.permissions) : undefined

    const willBeAdminType = body.isAdminType ?? profile.isAdminType
    if (willBeAdminType && !profile.isAdminType && !requesterIsAdminType) {
      throw new OnlyAdminCanGrantAdminTypeError()
    }

    if (body.name && body.name !== profile.name) {
      const existing = await prisma.accessProfile.findUnique({ where: { name: body.name } })
      if (existing) {
        throw new AccessProfileNameAlreadyExistsError(body.name)
      }
    }

    // Substitui todas as permissões quando enviadas (lista pequena, mais simples que diff)
    if (body.permissions) {
      await prisma.accessProfilePermission.deleteMany({ where: { profileId: id } })
    }

    const updateData: { name?: string; isAdminType?: boolean } = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.isAdminType !== undefined) updateData.isAdminType = body.isAdminType

    return prisma.accessProfile.update({
      where: { id },
      data: {
        ...updateData,
        ...(validPermissions
          ? {
              permissions: {
                create: validPermissions.map((p) => ({ pageKey: p.pageKey, level: p.level })),
              },
            }
          : {}),
      },
      include: profileInclude,
    })
  },

  async delete(id: string) {
    const profile = await prisma.accessProfile.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!profile) {
      throw new AccessProfileNotFoundError(id)
    }
    if (profile.isMaster || id === MASTER_ADMIN_PROFILE_ID) {
      throw new CannotModifyMasterProfileError()
    }
    if (profile._count.users > 0) {
      throw new AccessProfileInUseError(profile.name, profile._count.users)
    }

    await prisma.accessProfile.delete({ where: { id } })
  },
}
