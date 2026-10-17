import { z } from 'zod'
import { speciesSchema } from './pets'

/** Raio do alerta para vizinhos (km). */
export const LOST_PET_ALERT_RADIUS_KM = 10

export const lostPetStatuses = ['ACTIVE', 'FOUND', 'CANCELLED'] as const
export const lostPetStatusSchema = z.enum(lostPetStatuses)
export type LostPetStatus = z.infer<typeof lostPetStatusSchema>

const latitude = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)

export const lostPetAlertInputSchema = z.object({
  petId: z.uuid(),
  description: z.string().trim().max(500, 'Máximo de 500 caracteres'),
  rewardCents: z.number().int().min(0).max(10_000_000).nullable(),
  neighborhood: z.string().trim().min(2, 'Informe o bairro').max(80),
  /** Quando foi visto pela última vez (ISO); não pode estar no futuro. */
  lastSeenAt: z.iso
    .datetime({ offset: true })
    .refine((value) => Date.parse(value) <= Date.now() + 60_000, 'Data no futuro'),
  /** Sem GPS, o servidor usa a localização cadastrada do tutor. */
  latitude: latitude.nullable(),
  longitude: longitude.nullable(),
})
export type LostPetAlertInput = z.input<typeof lostPetAlertInputSchema>

export const resolveLostPetSchema = z.object({ status: z.enum(['FOUND', 'CANCELLED']) })

export const sightingInputSchema = z.object({
  message: z.string().trim().min(3, 'Conte onde e como viu o pet').max(300),
  latitude: latitude.nullable(),
  longitude: longitude.nullable(),
})
export type SightingInput = z.input<typeof sightingInputSchema>

/** Quem acha o pet pela plaquinha não precisa ter conta. */
export const tagFoundInputSchema = sightingInputSchema.extend({
  contact: z.string().trim().max(80),
})
export type TagFoundInput = z.input<typeof tagFoundInputSchema>

const alertPetSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  species: speciesSchema,
  breed: z.string().nullable(),
  photoUrl: z.string().nullable(),
})

export const lostPetAlertSummarySchema = z.object({
  id: z.uuid(),
  status: lostPetStatusSchema,
  pet: alertPetSchema,
  owner: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }),
  description: z.string(),
  rewardCents: z.number().int().nullable(),
  neighborhood: z.string(),
  /** Distância aproximada de quem está vendo até o último local conhecido. */
  distanceKm: z.number().int().nullable(),
  lastSeenAt: z.string(),
  createdAt: z.string(),
  sightingCount: z.number().int(),
  isMine: z.boolean(),
})
export type LostPetAlertSummary = z.infer<typeof lostPetAlertSummarySchema>

/** Avistamento: local e contato só chegam ao tutor. */
export const sightingSchema = z.object({
  id: z.uuid(),
  source: z.enum(['APP', 'TAG']),
  message: z.string(),
  contact: z.string(),
  reporter: z
    .object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() })
    .nullable(),
  /** Link de mapa com o ponto do avistamento (nulo sem localização). */
  mapsUrl: z.string().nullable(),
  /** Distância do avistamento até o último local conhecido. */
  distanceKm: z.number().int().nullable(),
  createdAt: z.string(),
})
export type Sighting = z.infer<typeof sightingSchema>

export const lostPetAlertDetailSchema = lostPetAlertSummarySchema.extend({
  /** Vazio para quem não é o tutor. */
  sightings: z.array(sightingSchema),
  /** Quem está vendo já avisou que viu. */
  reportedByMe: z.boolean(),
})
export type LostPetAlertDetail = z.infer<typeof lostPetAlertDetailSchema>

export const petTagSchema = z.object({ tagCode: z.string() })
export type PetTag = z.infer<typeof petTagSchema>

export const tagCodeParamsSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9]{6,16}$/, 'Código inválido'),
})

/** O que aparece para quem escaneia a plaquinha: nada que identifique o tutor além do primeiro nome. */
export const publicTagSchema = z.object({
  petName: z.string(),
  species: speciesSchema,
  photoUrl: z.string().nullable(),
  ownerFirstName: z.string(),
  isLost: z.boolean(),
  rewardCents: z.number().int().nullable(),
  description: z.string(),
})
export type PublicTag = z.infer<typeof publicTagSchema>

/** Link de mapa para um ponto (só para o tutor). */
export function mapsPointUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}
