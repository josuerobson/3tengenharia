import { z } from 'zod'

export const createIncidentBodySchema = z.object({
  description: z
    .string({ required_error: 'Descrição é obrigatória.' })
    .min(10, 'A descrição deve ter pelo menos 10 caracteres.')
    .trim(),
  location: z
    .string({ required_error: 'Local da ocorrência é obrigatório.' })
    .min(2, 'O local deve ter pelo menos 2 caracteres.')
    .trim(),
  photos: z.array(z.string()).optional(),
})

export type CreateIncidentBody = z.infer<typeof createIncidentBodySchema>
