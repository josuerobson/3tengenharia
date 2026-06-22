// src/modules/fiveS/fiveS.routes.ts
// Rotas do Módulo 5S — registradas sob o prefixo /api/v1/5s (via app.ts).
// Segue o mesmo padrão dos demais módulos: { onRequest } para autenticação,
// { preHandler } com requireRole para autorização baseada em RBAC.

import type { FastifyInstance } from 'fastify'
import { UserRole } from '@prisma/client'
import { fiveSController } from './fiveS.controller.js'

/** Schema de erro padrão — reutilizado em todos os responses de erro */
const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error:      { type: 'string' },
    message:    { type: 'string' },
    issues:     { type: 'object', description: 'Detalhes de erros de validação Zod.' },
  },
}

export async function fiveSRoutes(app: FastifyInstance): Promise<void> {
  const controller = fiveSController(app)

  // ── POST /5s/audits ──────────────────────────────────────────────────────────
  // Acesso: qualquer usuário autenticado (COLLABORATOR, MANAGER, ADMIN)
  // O auditor é sempre o colaborador logado (extraído do JWT — não enviado no body).
  app.post(
    '/audits',
    {
      onRequest: [app.authenticate],
      schema: {
        tags:        ['5S'],
        summary:     'Registrar auditoria 5S',
        description:
          'Cria um novo registro de auditoria 5S para uma área da obra. ' +
          'Aceita entre 1 e N fotos obrigatórias. ' +
          'Se status for NAO_CONFORME, o campo description torna-se obrigatório (mín. 20 chars). ' +
          'O auditor é identificado pelo token JWT — não é necessário enviar o employeeId.',
        security: [{ bearerAuth: [] }],
        body: {
          type:     'object',
          required: ['worksiteId', 'areaType', 'status', 'photoUrls'],
          properties: {
            worksiteId: {
              type:        'string',
              description: 'ID (cuid) da obra onde a auditoria foi realizada.',
            },
            areaType: {
              type:        'string',
              minLength:   2,
              maxLength:   100,
              description: 'Tipo de área. Ex: Canteiro, Almoxarifado, Escritório, Área Comum.',
            },
            status: {
              type:        'string',
              enum:        ['CONFORME', 'NAO_CONFORME'],
              description: 'Resultado da auditoria.',
            },
            description: {
              type:        'string',
              maxLength:   5000,
              description: 'Detalhes da irregularidade. Obrigatório para NAO_CONFORME (mín. 20 chars).',
            },
            photoUrls: {
              type:        'array',
              items:       { type: 'string', format: 'uri' },
              minItems:    1,
              description: 'URLs das fotos geradas pelo serviço de upload. Mínimo 1.',
            },
          },
        },
        response: {
          201: {
            type:        'object',
            description: 'Auditoria criada com sucesso.',
            properties: {
              message:     { type: 'string' },
              photosCount: { type: 'number' },
              audit:       { type: 'object' },
            },
          },
          404: { ...errorResponseSchema, description: 'Obra ou colaborador não encontrado.' },
          422: { ...errorResponseSchema, description: 'Dados de entrada inválidos.' },
        },
      },
    },
    controller.createAudit,
  )

  // ── PATCH /5s/audits/:id/validate ────────────────────────────────────────────
  // Acesso restrito: MANAGER, ADMIN (Setor de Qualidade)
  // Proibido para COLLABORATOR — o colaborador só cria, não valida.
  app.patch(
    '/audits/:id/validate',
    {
      onRequest: [app.authenticate],
      preHandler: [app.requireRole([UserRole.MANAGER, UserRole.ADMIN])],
      schema: {
        tags:        ['5S'],
        summary:     'Validar auditoria 5S (Qualidade)',
        description:
          'Aprova ou reprova uma auditoria pendente (AGUARDANDO_AVALIACAO). ' +
          'Exclusivo para Gestores e Administradores (Setor de Qualidade). ' +
          'Se validation = REPROVADO, o campo correctiveAction torna-se obrigatório. ' +
          'O ID do validador é capturado automaticamente do token JWT.',
        security: [{ bearerAuth: [] }],
        params: {
          type:     'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'ID (cuid) da auditoria a ser validada.' },
          },
        },
        body: {
          type:     'object',
          required: ['validation'],
          properties: {
            validation: {
              type:        'string',
              enum:        ['APROVADO', 'REPROVADO'],
              description: 'Novo status de validação. AGUARDANDO_AVALIACAO não é aceito neste endpoint.',
            },
            correctiveAction: {
              type:        'string',
              maxLength:   5000,
              description: 'Ação corretiva emitida pela Qualidade. Obrigatória para REPROVADO.',
            },
          },
        },
        response: {
          200: {
            type:        'object',
            description: 'Auditoria validada com sucesso.',
            properties: {
              message: { type: 'string' },
              audit:   { type: 'object' },
            },
          },
          403: { ...errorResponseSchema, description: 'Acesso negado — perfil insuficiente.' },
          404: { ...errorResponseSchema, description: 'Auditoria não encontrada.' },
          409: { ...errorResponseSchema, description: 'Auditoria já foi validada anteriormente.' },
          422: { ...errorResponseSchema, description: 'Dados de entrada inválidos.' },
        },
      },
    },
    controller.validateAudit,
  )

  // ── GET /5s/reports ───────────────────────────────────────────────────────────
  // Acesso: MANAGER, ADMIN — relatório gerencial com KPIs
  app.get(
    '/reports',
    {
      onRequest: [app.authenticate],
      preHandler: [app.requireRole([UserRole.MANAGER, UserRole.ADMIN])],
      schema: {
        tags:        ['5S'],
        summary:     'Relatório de auditorias 5S',
        description:
          'Lista auditorias com filtros dinâmicos, paginação e KPIs agregados. ' +
          'Exclusivo para Gestores e Administradores. ' +
          'Use os query params para filtrar por obra, status, período e validação.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            worksiteId: {
              type:        'string',
              description: 'Filtra por obra específica (cuid).',
            },
            status: {
              type:        'string',
              enum:        ['CONFORME', 'NAO_CONFORME'],
              description: 'Filtra por resultado da auditoria.',
            },
            validation: {
              type:        'string',
              enum:        ['AGUARDANDO_AVALIACAO', 'APROVADO', 'REPROVADO'],
              description: 'Filtra por estado de validação.',
            },
            dateFrom: {
              type:        'string',
              format:      'date',
              description: 'Data de início do período (ISO 8601 — ex: 2026-06-01).',
            },
            dateTo: {
              type:        'string',
              format:      'date',
              description: 'Data de fim do período (ISO 8601 — ex: 2026-06-30).',
            },
            page: {
              type:        'integer',
              minimum:     1,
              default:     1,
              description: 'Número da página.',
            },
            limit: {
              type:        'integer',
              minimum:     1,
              maximum:     100,
              default:     20,
              description: 'Itens por página.',
            },
          },
        },
        response: {
          200: {
            type:        'object',
            description: 'Listagem de auditorias com paginação e KPIs.',
            properties: {
              data:       { type: 'array', items: { type: 'object' } },
              pagination: {
                type: 'object',
                properties: {
                  page:        { type: 'number' },
                  limit:       { type: 'number' },
                  total:       { type: 'number' },
                  totalPages:  { type: 'number' },
                  hasNextPage: { type: 'boolean' },
                  hasPrevPage: { type: 'boolean' },
                },
              },
              kpis: {
                type: 'object',
                properties: {
                  total:               { type: 'number' },
                  conforme:            { type: 'number' },
                  naoConforme:         { type: 'number' },
                  aguardandoAvaliacao: { type: 'number' },
                  aprovado:            { type: 'number' },
                  reprovado:           { type: 'number' },
                },
              },
            },
          },
          403: { ...errorResponseSchema, description: 'Acesso negado.' },
        },
      },
    },
    controller.listReports,
  )
}
