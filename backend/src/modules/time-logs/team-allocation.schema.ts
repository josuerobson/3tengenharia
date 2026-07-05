// src/modules/time-logs/team-allocation.schema.ts

import { z } from 'zod'

export const teamAllocationBodySchema = z.object({
  worksiteId: z.string({ required_error: 'worksiteId é obrigatório.' }),
  managerId: z.string({ required_error: 'managerId é obrigatório.' }),
  employeeIds: z.array(z.string()),
})

export type TeamAllocationBody = z.infer<typeof teamAllocationBodySchema>
