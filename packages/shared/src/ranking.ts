import { z } from 'zod'
import { speciesSchema } from './pets'

/** Janela e raio do ranking da região. */
export const RANKING_DAYS = 30
export const RANKING_RADIUS_KM = 50
export const RANKING_LIMIT = 20

export const rankingQuerySchema = z.object({
  species: speciesSchema.optional(),
})

export const rankedPetSchema = z.object({
  position: z.number().int(),
  pet: z.object({
    id: z.uuid(),
    name: z.string(),
    species: speciesSchema,
    breed: z.string().nullable(),
    photoUrl: z.string().nullable(),
  }),
  owner: z.object({ id: z.uuid(), name: z.string() }),
  /** Curtidas recebidas nas publicações do pet no período. */
  likes: z.number().int(),
  posts: z.number().int(),
  distanceKm: z.number().int().nullable(),
  isMine: z.boolean(),
})
export type RankedPet = z.infer<typeof rankedPetSchema>

export const rankingSchema = z.object({
  /** Sem localização o ranking é geral (todas as regiões). */
  scope: z.enum(['region', 'everywhere']),
  items: z.array(rankedPetSchema),
})
export type Ranking = z.infer<typeof rankingSchema>
