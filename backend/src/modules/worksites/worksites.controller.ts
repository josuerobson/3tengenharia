// src/modules/worksites/worksites.controller.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createWorksiteBodySchema, updateWorksiteBodySchema } from './worksites.schema.js'
import {
  worksitesService,
  WorksiteNotFoundError,
  WorksiteCodeAlreadyExistsError,
  WorksiteHasRelationsError,
} from './worksites.service.js'

const DOMAIN_ERRORS = [
  WorksiteNotFoundError,
  WorksiteCodeAlreadyExistsError,
  WorksiteHasRelationsError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function worksitesController(_app: FastifyInstance) {
  return {
    async listWorksites(request: FastifyRequest, reply: FastifyReply) {
      const worksites = await worksitesService.list()
      return reply.status(200).send(worksites)
    },

    async createWorksite(request: FastifyRequest, reply: FastifyReply) {
      const body = createWorksiteBodySchema.parse(request.body)
      let worksite: Awaited<ReturnType<typeof worksitesService.create>>
      try {
        worksite = await worksitesService.create(body)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(201).send(worksite)
    },

    async updateWorksite(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = updateWorksiteBodySchema.parse(request.body)
      let worksite: Awaited<ReturnType<typeof worksitesService.update>>
      try {
        worksite = await worksitesService.update(id, body)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(200).send(worksite)
    },

    async deleteWorksite(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      try {
        await worksitesService.delete(id)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(204).send()
    },
  }
}
