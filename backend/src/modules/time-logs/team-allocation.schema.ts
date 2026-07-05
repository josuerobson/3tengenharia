// src/modules/time-logs/team-allocation.schema.ts

import { z } from 'zod'

export const teamAllocationBodySchema = z.object({
  worksiteId: z.string({ required_error: 'worksiteId é obrigatório.' }).cuid('ID da obra inválido.'),
  managerId: z.string({ required_error: 'managerId é obrigatório.' }).cuid('ID do gestor inválido.'),
  employeeIds: z.array(z.string().cuid('ID de funcionário inválido no array.')),
})

export type TeamAllocationBody = z.infer<typeof teamAllocationBodySchema>
