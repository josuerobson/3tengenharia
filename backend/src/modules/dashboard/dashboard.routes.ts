import type { FastifyInstance } from 'fastify'
import { dashboardController } from './dashboard.controller.js'

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/summary',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Dashboard'],
        summary: 'Obter indicadores de resumo de todos os módulos',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              general: {
                type: 'object',
                properties: {
                  activeUsers: { type: 'number' },
                  activeWorksites: { type: 'number' },
                }
              },
              vehicles: {
                type: 'object',
                properties: {
                  totalVehicles: { type: 'number' },
                  activeTrips: { type: 'number' },
                  maintenanceVehicles: { type: 'number' },
                  vehiclesWithAlert: { type: 'number' },
                  availableVehicles: { type: 'number' },
                }
              },
              warehouse: {
                type: 'object',
                properties: {
                  totalAssets: { type: 'number' },
                  availableAssets: { type: 'number' },
                  loanedAssets: { type: 'number' },
                  maintenanceAssets: { type: 'number' },
                  activeLoans: { type: 'number' },
                  openAssetMaintenances: { type: 'number' },
                }
              },
              timeLogs: {
                type: 'object',
                properties: {
                  pendingTimeLogs: { type: 'number' },
                  totalHoursLast7Days: { type: 'number' },
                }
              },
              fiveS: {
                type: 'object',
                properties: {
                  totalAudits5S: { type: 'number' },
                  conformAudits5S: { type: 'number' },
                  pendingAudits5S: { type: 'number' },
                  conformityRate5S: { type: 'number' },
                }
              }
            }
          }
        }
      }
    },
    dashboardController.getSummary
  )
}
