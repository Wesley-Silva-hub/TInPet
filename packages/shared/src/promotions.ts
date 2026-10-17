import { z } from 'zod'
import { speciesSchema } from './pets'
import { productSchema } from './products'

/** Durações oferecidas no assistente de impulsionar (em horas). */
export const promotionDurations = [6, 24, 72, 168, 336] as const

export const promotionDurationLabels: Record<(typeof promotionDurations)[number], string> = {
  6: '6 horas (relâmpago)',
  24: '1 dia',
  72: '3 dias',
  168: '1 semana',
  336: '2 semanas',
}

export const promotionInputSchema = z.object({
  productId: z.uuid(),
  headline: z.string().trim().min(3, 'Escreva uma chamada').max(80),
  discountPercent: z.number().int().min(5, 'Mínimo de 5%').max(90, 'Máximo de 90%').nullable(),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,30}$/, 'Use de 3 a 30 letras, números ou hífen')
    .nullable(),
  species: z.array(speciesSchema).max(6),
  radiusKm: z.number().int().min(1).max(100),
  durationHours: z
    .number()
    .int()
    .refine(
      (value) => (promotionDurations as readonly number[]).includes(value),
      'Duração inválida',
    ),
})
export type PromotionInput = z.input<typeof promotionInputSchema>

export const promotionStatuses = ['ACTIVE', 'PAUSED', 'ENDED'] as const
export const promotionStatusSchema = z.enum(promotionStatuses)
export type PromotionStatus = z.infer<typeof promotionStatusSchema>

/** O que o tutor vê: o código do cupom só aparece depois de "revelar". */
export const promotionSchema = z.object({
  id: z.uuid(),
  headline: z.string(),
  discountPercent: z.number().int().nullable(),
  hasCoupon: z.boolean(),
  endsAt: z.string(),
  finalPriceCents: z.number().int(),
  product: productSchema,
})
export type Promotion = z.infer<typeof promotionSchema>

/** O que a loja vê no painel: configuração e resultados. */
export const myPromotionSchema = promotionSchema.extend({
  couponCode: z.string().nullable(),
  species: z.array(speciesSchema),
  radiusKm: z.number().int(),
  startsAt: z.string(),
  status: promotionStatusSchema,
  impressions: z.number().int(),
  clicks: z.number().int(),
  couponReveals: z.number().int(),
})
export type MyPromotion = z.infer<typeof myPromotionSchema>

export const promotionEventSchema = z.object({ type: z.enum(['view', 'click']) })

export const couponRevealSchema = z.object({ couponCode: z.string() })

export function discountedPrice(priceCents: number, discountPercent: number | null): number {
  if (!discountPercent) return priceCents
  return Math.round((priceCents * (100 - discountPercent)) / 100)
}
