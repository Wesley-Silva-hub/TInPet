import { z } from 'zod'
import { speciesSchema } from './pets'

/** Raio em que os tutores são avisados de um evento novo (km). */
export const EVENT_NOTIFY_RADIUS_KM = 10
/** Até quanto tempo à frente dá para marcar um evento (dias). */
export const EVENT_MAX_DAYS_AHEAD = 180

export const eventKinds = ['MEETUP', 'ADOPTION_FAIR', 'WALK', 'VACCINATION', 'OTHER'] as const
export const eventKindSchema = z.enum(eventKinds)
export type EventKind = z.infer<typeof eventKindSchema>

export const eventKindLabels: Record<EventKind, string> = {
  MEETUP: 'Encontro de pets',
  ADOPTION_FAIR: 'Feira de adoção',
  WALK: 'Passeio em grupo',
  VACCINATION: 'Vacinação',
  OTHER: 'Outro',
}

const DAY_MS = 24 * 60 * 60 * 1000
const isoDateTime = z.iso.datetime({ offset: true })

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Dê um nome ao evento').max(80),
    description: z.string().trim().max(1000, 'Máximo de 1000 caracteres').default(''),
    kind: eventKindSchema,
    species: z.array(speciesSchema).max(6).default([]),
    startsAt: isoDateTime
      .refine((value) => Date.parse(value) > Date.now(), 'O evento precisa ser no futuro')
      .refine(
        (value) => Date.parse(value) < Date.now() + EVENT_MAX_DAYS_AHEAD * DAY_MS,
        `Marque com até ${EVENT_MAX_DAYS_AHEAD} dias de antecedência`,
      ),
    endsAt: isoDateTime.nullable().default(null),
    /** Lugar público onde vai acontecer (praça, parque, loja). */
    place: z.string().trim().min(3, 'Informe o local').max(120),
    neighborhood: z.string().trim().max(80).default(''),
    /** Sem GPS, o servidor usa a localização cadastrada de quem organiza. */
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine((data) => !data.endsAt || Date.parse(data.endsAt) > Date.parse(data.startsAt), {
    message: 'O fim precisa ser depois do início',
    path: ['endsAt'],
  })
export type EventInput = z.input<typeof eventInputSchema>

export const petEventSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  kind: eventKindSchema,
  species: z.array(speciesSchema),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  place: z.string(),
  neighborhood: z.string(),
  /** Distância aproximada de quem está vendo (nunca as coordenadas). */
  distanceKm: z.number().int().nullable(),
  organizer: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }),
  attendeeCount: z.number().int(),
  going: z.boolean(),
  isMine: z.boolean(),
  cancelled: z.boolean(),
})
export type PetEvent = z.infer<typeof petEventSchema>

export const eventAttendeeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
})

export const petEventDetailSchema = petEventSchema.extend({
  /** Primeiras pessoas confirmadas (para a "carinha" de quem vai). */
  attendees: z.array(eventAttendeeSchema),
})
export type PetEventDetail = z.infer<typeof petEventDetailSchema>
