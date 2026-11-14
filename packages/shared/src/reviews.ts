import { z } from 'zod'

export const storeReviewInputSchema = z.object({
  rating: z.number().int().min(1, 'Escolha de 1 a 5 estrelas').max(5, 'Escolha de 1 a 5 estrelas'),
  comment: z.string().trim().max(500, 'Máximo de 500 caracteres').default(''),
})
export type StoreReviewInput = z.input<typeof storeReviewInputSchema>

export const storeReviewSchema = z.object({
  id: z.uuid(),
  rating: z.number().int(),
  comment: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }),
  isMine: z.boolean(),
})
export type StoreReview = z.infer<typeof storeReviewSchema>

/** Média com uma casa decimal; nula enquanto não houver avaliações. */
export const ratingSummarySchema = z.object({
  average: z.number().nullable(),
  count: z.number().int(),
})
export type RatingSummary = z.infer<typeof ratingSummarySchema>

export const storeReviewsSchema = z.object({
  summary: ratingSummarySchema,
  mine: storeReviewSchema.nullable(),
  items: z.array(storeReviewSchema),
})
export type StoreReviews = z.infer<typeof storeReviewsSchema>
