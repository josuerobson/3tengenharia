import { z } from 'zod'

export const createFuelRecordBodySchema = z.object({
  odometerKm: z
    .number({ required_error: 'Quilometragem atual é obrigatória.' })
    .int('Quilometragem deve ser um número inteiro.')
    .nonnegative('Quilometragem não pode ser negativa.'),
  liters: z
    .number({ required_error: 'Quantidade de litros é obrigatória.' })
    .positive('Quantidade de litros deve ser maior que zero.'),
  totalAmount: z
    .number({ required_error: 'Valor total abastecido é obrigatório.' })
    .positive('Valor total deve ser maior que zero.'),
  odometerPhoto: z
    .string({ required_error: 'Foto do hodômetro é obrigatória.' })
    .min(1, 'Foto do hodômetro é obrigatória.'),
  receiptPhoto: z
    .string({ required_error: 'Foto do cupom de abastecimento é obrigatória.' })
    .min(1, 'Foto do cupom de abastecimento é obrigatória.'),
})

export type CreateFuelRecordBody = z.infer<typeof createFuelRecordBodySchema>
