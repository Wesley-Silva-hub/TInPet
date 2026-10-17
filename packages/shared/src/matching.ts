import { z } from 'zod'
import { paginationQuerySchema } from './common'
import { petSchema } from './pets'
import { publicUserSchema } from './users'

export const feedQuerySchema = paginationQuerySchema.extend({
  petId: z.uuid(),
  maxDistanceKm: z.coerce.number().int().min(1).max(500).default(50),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})
export type FeedQuery = z.input<typeof feedQuerySchema>

export const feedItemSchema = z.object({
  pet: petSchema,
  owner: publicUserSchema,
  /** Distância aproximada em km (nunca coordenadas). Nula se algum dos donos não tem localização. */
  distanceKm: z.number().int().nullable(),
})
export type FeedItem = z.infer<typeof feedItemSchema>

export const swipeDirections = ['LIKE', 'PASS'] as const
export const swipeInputSchema = z.object({
  fromPetId: z.uuid(),
  toPetId: z.uuid(),
  direction: z.enum(swipeDirections),
})
export type SwipeInput = z.infer<typeof swipeInputSchema>

export const matchSummarySchema = z.object({
  id: z.uuid(),
  createdAt: z.string(),
  myPet: petSchema,
  otherPet: petSchema,
  otherOwner: publicUserSchema,
  lastMessage: z
    .object({ content: z.string(), createdAt: z.string(), mine: z.boolean() })
    .nullable(),
  unreadCount: z.number().int(),
})
export type MatchSummary = z.infer<typeof matchSummarySchema>

export const swipeResultSchema = z.object({ match: matchSummarySchema.nullable() })
export type SwipeResult = z.infer<typeof swipeResultSchema>

export const reportReasons = ['SPAM', 'OFFENSIVE', 'FAKE_PROFILE', 'ANIMAL_ABUSE', 'OTHER'] as const
export const reportInputSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).default(''),
})
export type ReportInput = z.input<typeof reportInputSchema>

export const reportReasonLabels: Record<(typeof reportReasons)[number], string> = {
  SPAM: 'Spam ou propaganda',
  OFFENSIVE: 'Conteúdo ofensivo',
  FAKE_PROFILE: 'Perfil falso',
  ANIMAL_ABUSE: 'Maus-tratos a animais',
  OTHER: 'Outro motivo',
}
