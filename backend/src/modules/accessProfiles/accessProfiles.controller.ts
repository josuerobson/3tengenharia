// src/modules/accessProfiles/accessProfiles.controller.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createAccessProfileBodySchema, editAccessProfileBodySchema } from './accessProfiles.schema.js'
import {
  accessProfilesService,
  AccessProfileNotFoundError,
  AccessProfileNameAlreadyExistsError,
  CannotModifyMasterProfileError,
  OnlyAdminCanGrantAdminTypeError,
  AccessProfileInUseError,
} from './accessProfiles.service.js'

const DOMAIN_ERRORS = [
  AccessProfileNotFoundError,
  AccessProfileNameAlreadyExistsError,
  CannotModifyMasterProfileError,
  OnlyAdminCanGrantAdminTypeError,
  AccessProfileInUseError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function accessProfilesController(_app: FastifyInstance) {
  return {
    async listPages(request: FastifyRequest, reply: FastifyReply) {
      const pages = await accessProfilesService.listPages()
      return reply.status(200).send(pages)
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const profiles = await accessProfilesService.list()
      return reply.status(200).send(profiles)
    },

    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = createAccessProfileBodySchema.parse(request.body)
      let profile: Awaited<ReturnType<typeof accessProfilesService.create>>
      try {
        profile = await accessProfilesService.create(body, request.currentUser.isAdminType)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(201).send(profile)
    },

    async edit(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = editAccessProfileBodySchema.parse(request.body)
      let profile: Awaited<ReturnType<typeof accessProfilesService.edit>>
      try {
        profile = await accessProfilesService.edit(id, body, request.currentUser.isAdminType)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(200).send(profile)
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      try {
        await accessProfilesService.delete(id)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(204).send()
    },
  }
}
