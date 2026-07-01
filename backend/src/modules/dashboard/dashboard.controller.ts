import type { FastifyReply, FastifyRequest } from 'fastify'
import { dashboardService } from './dashboard.service.js'

export const dashboardController = {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const summary = await dashboardService.getSummary()
    return reply.status(200).send(summary)
  }
}
