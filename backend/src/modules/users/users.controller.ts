// src/modules/users/users.controller.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { createUserBodySchema, updateUserBodySchema } from './users.schema.js'
import {
  usersService,
  UserNotFoundError,
  EmailAlreadyExistsError,
  EmployeeNotFoundError,
  EmployeeAlreadyLinkedError,
  RegistrationAlreadyExistsError,
} from './users.service.js'

const DOMAIN_ERRORS = [
  UserNotFoundError,
  EmailAlreadyExistsError,
  EmployeeNotFoundError,
  EmployeeAlreadyLinkedError,
  RegistrationAlreadyExistsError,
]

function rethrowDomain(err: unknown): never {
  for (const DomainError of DOMAIN_ERRORS) {
    if (err instanceof DomainError) throw err
  }
  throw err
}

export function usersController(_app: FastifyInstance) {
  return {
    async listUsers(request: FastifyRequest, reply: FastifyReply) {
      const users = await usersService.list()
      return reply.status(200).send(users)
    },

    async createUser(request: FastifyRequest, reply: FastifyReply) {
      const body = createUserBodySchema.parse(request.body)
      let user: Awaited<ReturnType<typeof usersService.create>>
      try {
        user = await usersService.create(body)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(201).send(user)
    },

    async updateUser(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      const body = updateUserBodySchema.parse(request.body)
      let user: Awaited<ReturnType<typeof usersService.update>>
      try {
        user = await usersService.update(id, body)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(200).send(user)
    },

    async deleteUser(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string }
      try {
        await usersService.delete(id)
      } catch (err) {
        rethrowDomain(err)
      }
      return reply.status(204).send()
    },
  }
}
