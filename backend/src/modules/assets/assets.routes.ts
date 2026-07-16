// src/modules/assets/assets.routes.ts

import type { FastifyInstance } from 'fastify'
import { assetsController } from './assets.controller.js'

const assetResponseProperties = {
  id: { type: 'string' },
  assetTag: { type: 'string' },
  description: { type: 'string' },
  categoryId: { type: 'string', nullable: true },
  category: { type: 'string' },
  brand: { type: 'string', nullable: true },
  model: { type: 'string', nullable: true },
  serialNumber: { type: 'string', nullable: true },
  acquisitionDate: { type: 'string', nullable: true },
  acquisitionValue: { type: 'number', nullable: true },
  currentStatus: { type: 'string' },
  location: { type: 'string', nullable: true },
  notes: { type: 'string', nullable: true },
  photoUrl: { type: 'string', nullable: true },
  photoUrl2: { type: 'string', nullable: true },
  photoUrl3: { type: 'string', nullable: true },
  photoUrl4: { type: 'string', nullable: true },
  currentBorrowee: { type: 'string', nullable: true },
  activeLoanId: { type: 'string', nullable: true },
} as const

const assetWriteBodyProperties = {
  assetTag: { type: 'string' },
  description: { type: 'string' },
  categoryId: { type: 'string' },
  brand: { type: 'string', nullable: true },
  model: { type: 'string', nullable: true },
  serialNumber: { type: 'string', nullable: true },
  acquisitionDate: { type: 'string', nullable: true },
  acquisitionValue: { type: 'number', nullable: true },
  location: { type: 'string', nullable: true },
  notes: { type: 'string', nullable: true },
  photoUrl: { type: 'string', nullable: true },
  photoUrl2: { type: 'string', nullable: true },
  photoUrl3: { type: 'string', nullable: true },
  photoUrl4: { type: 'string', nullable: true },
} as const

const loanResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    assetId: { type: 'string' },
    borrowerEmployeeId: { type: 'string' },
    destinationWorksiteId: { type: 'string', nullable: true },
    createdByUserId: { type: 'string', nullable: true },
    checkoutAt: { type: 'string' },
    expectedReturnAt: { type: 'string', nullable: true },
    checkoutNotes: { type: 'string', nullable: true },
    isReturned: { type: 'boolean' },
    returnedAt: { type: 'string', nullable: true },
    returnNotes: { type: 'string', nullable: true },
    returnPhotoUrl: { type: 'string', nullable: true },
    returnedByUserId: { type: 'string', nullable: true },
    asset: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        assetTag: { type: 'string' },
        description: { type: 'string' },
        brand: { type: 'string', nullable: true },
        model: { type: 'string', nullable: true },
        currentStatus: { type: 'string' },
      },
    },
    borrowerEmployee: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        registration: { type: 'string' },
      },
    },
    destinationWorksite: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}

const maintenanceLogResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    assetId: { type: 'string' },
    issueDescription: { type: 'string' },
    defectPhotoUrl: { type: 'string', nullable: true },
    reportedByUserId: { type: 'string', nullable: true },
    reportedAt: { type: 'string' },
    maintenanceStatus: { type: 'string' },
    repairCost: { type: 'number', nullable: true },
    resolvedAt: { type: 'string', nullable: true },
    resolutionNotes: { type: 'string', nullable: true },
    asset: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        assetTag: { type: 'string' },
        description: { type: 'string' },
        brand: { type: 'string', nullable: true },
        model: { type: 'string', nullable: true },
        currentStatus: { type: 'string' },
      },
    },
  },
}

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  const controller = assetsController(app)

  // ── GET /assets ────────────────────────────────────────────────────────────
  app.get(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'READ')],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todos os bens patrimoniais',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: assetResponseProperties,
            },
          },
        },
      },
    },
    controller.listAssets,
  )

  // ── POST /assets ───────────────────────────────────────────────────────────
  app.post(
    '/',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Criar um novo bem patrimonial',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetTag', 'categoryId'],
          properties: assetWriteBodyProperties,
        },
        response: {
          201: {
            type: 'object',
            properties: assetResponseProperties,
          },
        },
      },
    },
    controller.createAsset,
  )

  // ── PATCH /assets/:id ──────────────────────────────────────────────────────
  // Edita os dados cadastrais de um bem existente (não altera currentStatus —
  // isso continua exclusivo dos fluxos de manutenção/empréstimo/devolução).
  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Editar um bem patrimonial existente',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: assetWriteBodyProperties,
        },
        response: {
          200: {
            type: 'object',
            properties: assetResponseProperties,
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.updateAsset,
  )

  // ── POST /assets/loans/:id/return ──────────────────────────────────────────
  // Mantido apenas para encerrar empréstimos legados (AssetLoan) criados antes
  // da migração para o fluxo de solicitações (AssetLoanRequest). Não há mais
  // rota de criação — toda nova saída deve passar por /assets/requests/:id/allocate.
  // Requer: MANAGER ou ADMIN
  app.post(
    '/loans/:id/return',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.activeLoans', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Registrar devolução de bem patrimonial emprestado',
        description: 'Encerra o registro de empréstimo e altera o status do bem de volta para AVAILABLE.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            returnedAt: { type: 'string', format: 'date-time' },
            returnNotes: { type: 'string' },
            returnPhotoUrl: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              loan: loanResponseSchema,
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.returnLoan,
  )

  // ── POST /assets/maintenance ───────────────────────────────────────────────
  // Requer: qualquer usuário autenticado pode abrir um chamado de avaria
  app.post(
    '/maintenance',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.defect.new', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Abrir chamado de avaria/manutenção',
        description:
          'Registra a avaria de um bem patrimonial e altera seu status imediatamente ' +
          'para MAINTENANCE. Aceita URL de foto do defeito.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetId', 'issueDescription'],
          properties: {
            assetId: { type: 'string' },
            issueDescription: { type: 'string', minLength: 10 },
            defectPhotoUrl: { type: 'string', format: 'uri' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              maintenanceLog: maintenanceLogResponseSchema,
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
          409: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.createMaintenanceLog,
  )

  // ── POST /assets/maintenance/resolve ───────────────────────────────────────
  app.post(
    '/maintenance/resolve',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Registrar reparo/resolução de manutenção',
        description:
          'Registra o conserto ou baixa de um bem em manutenção, alterando seu status ' +
          'para AVAILABLE ou WRITTEN_OFF, informando custos e descrição do reparo.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['assetId', 'resolutionNotes', 'repairCost', 'action'],
          properties: {
            assetId: { type: 'string' },
            resolutionNotes: { type: 'string', minLength: 5 },
            repairCost: { type: 'number', minimum: 0 },
            action: { type: 'string', enum: ['RESOLVED', 'WRITTEN_OFF'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              maintenanceLog: maintenanceLogResponseSchema,
            },
          },
          404: { type: 'object', properties: { statusCode: { type: 'number' }, error: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
    controller.resolveMaintenanceLog,
  )

  // ── GET /assets/employees ──────────────────────────────────────────────────
  app.get(
    '/employees',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todos os colaboradores ativos',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fullName: { type: 'string' },
                registration: { type: 'string' },
                position: { type: 'string' },
                cnhExpirationDate: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    controller.listEmployees,
  )

  // ── GET /assets/worksites ──────────────────────────────────────────────────
  app.get(
    '/worksites',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar todas as obras ativas',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
    },
    controller.listWorksites,
  )

  // ── CATEGORIAS DINÂMICAS ───────────────────────────────────────────────────
  app.get(
    '/categories',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Assets'],
        summary: 'Listar categorias de bens',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.listCategories
  )

  app.post(
    '/categories',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Criar categoria de bem',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.createCategory
  )

  app.patch(
    '/categories/:id',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.inventory', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Atualizar categoria de bem',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.updateCategory
  )

  // ── FLUXO DE SOLICITAÇÃO (LOAN REQUESTS) ──────────────────────────────────
  // Aceita assets.requests OU assets.warehouse.fulfillment — a aba "Solicitações
  // & Devoluções" do Almoxarifado usa esta mesma listagem pra saber o que
  // atender, então precisa funcionar mesmo sem acesso a "Minhas Solicitações".
  app.get(
    '/requests',
    {
      onRequest: [app.authenticate, app.requirePermission(['assets.requests', 'assets.warehouse.fulfillment'], 'READ')],
      schema: {
        tags: ['Assets'],
        summary: 'Listar solicitações de empréstimo',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.listLoanRequests
  )

  app.post(
    '/requests',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.requests', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Criar solicitação de empréstimo',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.createLoanRequest
  )

  app.post(
    '/requests/batch',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.requests', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Criar solicitação com múltiplos equipamentos/quantidades em um único pedido',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.createLoanRequestBatch
  )

  app.patch(
    '/requests/:id/cancel',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.requests', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Cancelar solicitação de empréstimo ainda não atendida',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.cancelLoanRequest
  )

  app.post(
    '/requests/:id/allocate',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.fulfillment', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Vincular e enviar patrimônio físico para solicitação',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.allocateLoanRequest
  )

  app.post(
    '/requests/batch/allocate',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.fulfillment', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Vincular e enviar bens físicos para todas as unidades de um pedido em lote',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.allocateLoanRequestBatch
  )

  app.post(
    '/requests/:id/return',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.requests', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Registrar intenção/checklist de devolução',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.submitReturn
  )

  app.post(
    '/requests/:id/validate',
    {
      onRequest: [app.authenticate, app.requirePermission('assets.warehouse.fulfillment', 'WRITE')],
      schema: {
        tags: ['Assets'],
        summary: 'Validar devolução e definir estado final do equipamento',
        security: [{ bearerAuth: [] }],
      } as any
    },
    controller.validateReturn
  )
}

