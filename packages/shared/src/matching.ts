import { z } from 'zod'
import { ageFrom, paginationQuerySchema } from './common'
import { type PetPurpose, type PetSize, petSchema } from './pets'
import { publicUserSchema } from './users'

export const feedQuerySchema = paginationQuerySchema.extend({
  petId: z.uuid(),
  maxDistanceKm: z.coerce.number().int().min(1).max(500).default(50),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  /** Portes aceitos, separados por vírgula (ex.: SMALL,MEDIUM). */
  sizes: z
    .string()
    .regex(/^(SMALL|MEDIUM|LARGE)(,(SMALL|MEDIUM|LARGE))*$/)
    .optional(),
  minAge: z.coerce.number().int().min(0).max(30).optional(),
  maxAge: z.coerce.number().int().min(0).max(30).optional(),
})
export type FeedQuery = z.input<typeof feedQuerySchema>

export const feedItemSchema = z.object({
  pet: petSchema,
  owner: publicUserSchema,
  /** Distância aproximada em km (nunca coordenadas). Nula se algum dos donos não tem localização. */
  distanceKm: z.number().int().nullable(),
  affinity: z.object({ score: z.number().int(), reasons: z.array(z.string()) }),
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

interface AffinityPet {
  size: PetSize
  purpose: PetPurpose
  birthDate: string | null
  breedId: number | null
}

const sizeOrder: Record<PetSize, number> = { SMALL: 0, MEDIUM: 1, LARGE: 2 }

/**
 * Afinidade de 40 a 99% entre dois pets já compatíveis, com os motivos em linguagem simples.
 * Regra transparente: porte, idade, objetivo, raça e distância.
 */
export function petAffinity(
  mine: AffinityPet,
  other: AffinityPet,
  distanceKm: number | null,
  now = new Date(),
): { score: number; reasons: string[] } {
  let score = 40
  const reasons: string[] = []

  const sizeGap = Math.abs(sizeOrder[mine.size] - sizeOrder[other.size])
  if (sizeGap === 0) {
    score += 18
    reasons.push('Mesmo porte')
  } else if (sizeGap === 1) {
    score += 8
  }

  if (mine.birthDate && other.birthDate) {
    const ageGap = Math.abs(ageFrom(mine.birthDate, now) - ageFrom(other.birthDate, now))
    if (ageGap <= 2) {
      score += 15
      reasons.push('Idades parecidas')
    } else if (ageGap <= 5) {
      score += 7
    }
  }

  if (mine.purpose === other.purpose) {
    score += 10
    reasons.push('Mesmo objetivo')
  } else if (mine.purpose === 'BOTH' || other.purpose === 'BOTH') {
    score += 5
  }

  if (mine.breedId !== null && mine.breedId === other.breedId) {
    score += 6
    reasons.push('Mesma raça')
  }

  if (distanceKm !== null) {
    if (distanceKm <= 5) {
      score += 12
      reasons.push('Bem pertinho')
    } else if (distanceKm <= 15) {
      score += 6
    }
  }

  return { score: Math.min(99, score), reasons }
}
