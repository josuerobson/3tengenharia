// src/modules/fiveS/fiveS.schema.ts
// Schemas Zod de validação para o Módulo 5S (Auditorias de Organização).
// Toda lógica condicional é isolada em superRefine para mensagens de erro precisas.

import { z } from 'zod'
import { AuditStatus5S, ValidationStatus5S } from '@prisma/client'

// ── Enums reutilizáveis ───────────────────────────────────────────────────────

const auditStatus5SEnum = z.nativeEnum(AuditStatus5S, {
  errorMap: () => ({
    message: `Status inválido. Valores aceitos: ${Object.values(AuditStatus5S).join(', ')}.`,
  }),
})

const validationStatus5SEnum = z.nativeEnum(ValidationStatus5S, {
  errorMap: () => ({
    message: `Status de validação inválido. Valores aceitos: ${Object.values(ValidationStatus5S).join(', ')}.`,
  }),
})

// ── Parâmetro de rota compartilhado ──────────────────────────────────────────

export const auditIdParamSchema = z.object({
  id: z.string({ required_error: 'ID da auditoria é obrigatório.' }).cuid('ID de auditoria inválido.'),
})

export type AuditIdParam = z.infer<typeof auditIdParamSchema>

// ── POST /5s/audits — Criar Auditoria ────────────────────────────────────────

export const createAuditBodySchema = z
  .object({
    worksiteId: z
      .string({ required_error: 'worksiteId é obrigatório.' })
      .cuid('ID da obra inválido.'),

    /**
     * Tipo de área auditada.
     * Valores sugeridos: "Canteiro", "Almoxarifado", "Escritório", "Área Comum".
     * Campo livre para manter flexibilidade operacional.
     */
    areaType: z
      .string({ required_error: 'Tipo de área é obrigatório.' })
      .min(2, 'Tipo de área deve ter pelo menos 2 caracteres.')
      .max(100, 'Tipo de área deve ter no máximo 100 caracteres.')
      .trim(),

    status: auditStatus5SEnum,

    /**
     * Descrição da irregularidade ou observação.
     * Obrigatório e mínimo de 20 caracteres quando status === NAO_CONFORME.
     * Opcional quando status === CONFORME.
     */
    description: z.string().trim().max(5000).optional(),

    /**
     * URLs das fotos da auditoria.
     * Mínimo 1 foto por registro — obrigatório para todas as auditorias.
     * Cada URL deve ser uma string válida (gerada pelo serviço de upload).
     */
    photoUrls: z
      .array(
        z.string({ required_error: 'URL da foto é obrigatória.' }).url('URL de foto inválida.').min(1),
        { required_error: 'Pelo menos uma foto é obrigatória.' },
      )
      .min(1, 'Você deve incluir pelo menos 1 foto na auditoria.'),
  })
  .superRefine((data, ctx) => {
    // ⚙️ REGRA DE NEGÓCIO: description obrigatória e detalhada para NAO_CONFORME
    if (data.status === AuditStatus5S.NAO_CONFORME) {
      if (!data.description || data.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['description'],
          message:
            'A descrição é obrigatória para auditorias Não Conformes. ' +
            'Detalhe a irregularidade encontrada.',
        })
        return // early exit — evita emitir o erro de comprimento também
      }

      if (data.description.trim().length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: 'string',
          minimum: 20,
          inclusive: true,
          path: ['description'],
          message:
            'Para não conformidades, a descrição deve ter pelo menos 20 caracteres. ' +
            'Seja específico sobre a irregularidade detectada.',
        })
      }
    }
  })

export type CreateAuditBody = z.infer<typeof createAuditBodySchema>

// ── PATCH /5s/audits/:id/validate — Validação da Qualidade ───────────────────

export const validateAuditBodySchema = z
  .object({
    /**
     * Novo status de validação.
     * Apenas APROVADO ou REPROVADO são aceitos neste endpoint
     * (AGUARDANDO_AVALIACAO é o estado inicial e não pode ser reaplicado).
     */
    validation: z.enum([ValidationStatus5S.APROVADO, ValidationStatus5S.REPROVADO], {
      errorMap: () => ({
        message: `Valor inválido. Use: ${ValidationStatus5S.APROVADO} ou ${ValidationStatus5S.REPROVADO}.`,
      }),
    }),

    /**
     * Ação corretiva emitida pela Qualidade.
     * Obrigatória quando validation === REPROVADO — descreve o que deve ser corrigido.
     * Opcional (mas recomendada) quando APROVADO.
     */
    correctiveAction: z.string().trim().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    // ⚙️ REGRA DE NEGÓCIO: correctiveAction obrigatória para REPROVADO
    if (data.validation === ValidationStatus5S.REPROVADO) {
      if (!data.correctiveAction || data.correctiveAction.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctiveAction'],
          message:
            'A ação corretiva é obrigatória ao reprovar uma auditoria. ' +
            'Descreva o que deve ser corrigido.',
        })
        return
      }

      if (data.correctiveAction.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: 'string',
          minimum: 10,
          inclusive: true,
          path: ['correctiveAction'],
          message: 'A ação corretiva deve ter pelo menos 10 caracteres.',
        })
      }
    }
  })

export type ValidateAuditBody = z.infer<typeof validateAuditBodySchema>

// ── GET /5s/reports — Query params ───────────────────────────────────────────

export const reportsQuerySchema = z.object({
  /** Filtra por obra específica */
  worksiteId: z.string().cuid('ID da obra inválido.').optional(),

  /** Filtra por status da auditoria */
  status: auditStatus5SEnum.optional(),

  /** Filtra por status de validação */
  validation: validationStatus5SEnum.optional(),

  /** Data de início do período (ISO 8601 — ex: 2026-06-01) */
  dateFrom: z.coerce.date({ invalid_type_error: 'dateFrom deve ser uma data válida.' }).optional(),

  /** Data de fim do período (ISO 8601 — ex: 2026-06-30) */
  dateTo: z.coerce.date({ invalid_type_error: 'dateTo deve ser uma data válida.' }).optional(),

  /** Número da página (paginação) */
  page: z.coerce
    .number({ invalid_type_error: 'page deve ser um número.' })
    .int()
    .min(1, 'page mínima é 1.')
    .default(1),

  /** Itens por página */
  limit: z.coerce
    .number({ invalid_type_error: 'limit deve ser um número.' })
    .int()
    .min(1)
    .max(100, 'Máximo de 100 itens por página.')
    .default(20),
})

export type ReportsQuery = z.infer<typeof reportsQuerySchema>
