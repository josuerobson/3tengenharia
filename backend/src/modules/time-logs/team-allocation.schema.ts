// src/modules/time-logs/team-allocation.schema.ts
// Nota: IDs usam z.string() genérico (em vez de .cuid()) para suportar IDs de teste/sementes customizados no banco.

import { z } from 'zod'

export const teamAllocationBodySchema = z.object({
  worksiteId: z.string({ required_error: 'worksiteId é obrigatório.' }),
  managerId: z.string({ required_error: 'managerId é obrigatório.' }),
  employeeIds: z.array(z.string()),
})

export type TeamAllocationBody = z.infer<typeof teamAllocationBodySchema>
