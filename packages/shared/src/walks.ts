import { z } from 'zod'
import { speciesSchema } from './pets'

/** Raio em que os passeadores aparecem para o tutor (km). */
export const WALKER_RADIUS_KM = 20
/** Até quantos dias à frente dá para pedir um passeio. */
export const WALK_MAX_DAYS_AHEAD = 60
export const walkDurations = [30, 45, 60, 90] as const

export const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export const walkStatuses = ['REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'DONE'] as const
export const walkStatusSchema = z.enum(walkStatuses)
export type WalkStatus = z.infer<typeof walkStatusSchema>

export const walkStatusLabels: Record<WalkStatus, string> = {
  REQUESTED: 'Aguardando resposta',
  ACCEPTED: 'Confirmado',
  DECLINED: 'Recusado',
  CANCELLED: 'Cancelado',
  DONE: 'Realizado',
}

export const walkerProfileInputSchema = z.object({
  bio: z.string().trim().max(500).default(''),
  /** Preço por passeio em centavos (0 = voluntário). */
  priceCents: z.number().int().min(0).max(100_000),
  walkMinutes: z.number().int().min(15).max(180),
  neighborhoods: z.string().trim().max(200).default(''),
  species: z.array(speciesSchema).min(1, 'Escolha ao menos uma espécie').max(6),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Escolha ao menos um dia')
    .max(7)
    .transform((days) => [...new Set(days)].sort()),
  active: z.boolean().default(true),
})
export type WalkerProfileInput = z.input<typeof walkerProfileInputSchema>

export const walkerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  bio: z.string(),
  priceCents: z.number().int(),
  walkMinutes: z.number().int(),
  neighborhoods: z.string(),
  species: z.array(speciesSchema),
  weekdays: z.array(z.number().int()),
  active: z.boolean(),
  distanceKm: z.number().int().nullable(),
  completedWalks: z.number().int(),
})
export type Walker = z.infer<typeof walkerSchema>

export const walkRequestInputSchema = z.object({
  walkerId: z.uuid(),
  petId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.union(walkDurations.map((minutes) => z.literal(minutes))),
  note: z.string().trim().max(300).default(''),
})
export type WalkRequestInput = z.input<typeof walkRequestInputSchema>

export const walkResponseInputSchema = z.object({
  note: z.string().trim().max(300).default(''),
})

const person = z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() })

export const walkSchema = z.object({
  id: z.uuid(),
  status: walkStatusSchema,
  startsAt: z.string(),
  durationMinutes: z.number().int(),
  priceCents: z.number().int(),
  note: z.string(),
  responseNote: z.string(),
  pet: z.object({ id: z.uuid(), name: z.string(), photoUrl: z.string().nullable() }),
  walker: person,
  owner: person,
  /** Papel de quem está vendo neste passeio. */
  myRole: z.enum(['OWNER', 'WALKER']),
  createdAt: z.string(),
})
export type Walk = z.infer<typeof walkSchema>
