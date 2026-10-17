import { z } from 'zod'
import { isoDateSchema } from './common'
import { vaccineStatusSchema } from './health'

export const species = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'RODENT', 'OTHER'] as const
export const speciesSchema = z.enum(species)
export type Species = z.infer<typeof speciesSchema>

export const petSexes = ['MALE', 'FEMALE'] as const
export const petSexSchema = z.enum(petSexes)
export type PetSex = z.infer<typeof petSexSchema>

export const petSizes = ['SMALL', 'MEDIUM', 'LARGE'] as const
export const petSizeSchema = z.enum(petSizes)
export type PetSize = z.infer<typeof petSizeSchema>

/** MATING = cruzamento, FRIENDSHIP = amizade/brincadeira. */
export const petPurposes = ['MATING', 'FRIENDSHIP', 'BOTH'] as const
export const petPurposeSchema = z.enum(petPurposes)
export type PetPurpose = z.infer<typeof petPurposeSchema>

export const MAX_PET_PHOTOS = 6

export const petInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(50),
  species: speciesSchema,
  breedId: z.number().int().positive().nullable(),
  sex: petSexSchema,
  size: petSizeSchema,
  birthDate: isoDateSchema.nullable(),
  bio: z.string().trim().max(500),
  purpose: petPurposeSchema,
})
export type PetInput = z.input<typeof petInputSchema>

export const petUpdateSchema = petInputSchema.partial().extend({ isActive: z.boolean().optional() })
export type PetUpdateInput = z.input<typeof petUpdateSchema>

export const breedSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  species: speciesSchema,
})
export type Breed = z.infer<typeof breedSchema>

export const petPhotoSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  position: z.number().int(),
})
export type PetPhoto = z.infer<typeof petPhotoSchema>

export const petSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  species: speciesSchema,
  breed: z.string().nullable(),
  breedId: z.number().int().nullable(),
  sex: petSexSchema,
  size: petSizeSchema,
  birthDate: z.string().nullable(),
  bio: z.string(),
  purpose: petPurposeSchema,
  isActive: z.boolean(),
  photos: z.array(petPhotoSchema),
  /** Só a situação; o detalhe das vacinas é privado do tutor. */
  vaccineStatus: vaccineStatusSchema,
})
export type Pet = z.infer<typeof petSchema>

/**
 * Regra de compatibilidade do feed (mesma espécie é verificada à parte):
 * amizade combina com qualquer sexo; cruzamento exige sexo oposto.
 */
export function arePurposesCompatible(
  a: { purpose: PetPurpose; sex: PetSex },
  b: { purpose: PetPurpose; sex: PetSex },
): boolean {
  const wants = (p: PetPurpose, goal: 'MATING' | 'FRIENDSHIP') => p === goal || p === 'BOTH'
  const friendship = wants(a.purpose, 'FRIENDSHIP') && wants(b.purpose, 'FRIENDSHIP')
  const mating = wants(a.purpose, 'MATING') && wants(b.purpose, 'MATING') && a.sex !== b.sex
  return friendship || mating
}

export const speciesLabels: Record<Species, string> = {
  DOG: 'Cachorro',
  CAT: 'Gato',
  BIRD: 'Pássaro',
  RABBIT: 'Coelho',
  RODENT: 'Roedor',
  OTHER: 'Outro',
}
export const sexLabels: Record<PetSex, string> = { MALE: 'Macho', FEMALE: 'Fêmea' }
export const sizeLabels: Record<PetSize, string> = {
  SMALL: 'Pequeno',
  MEDIUM: 'Médio',
  LARGE: 'Grande',
}
export const purposeLabels: Record<PetPurpose, string> = {
  MATING: 'Cruzamento',
  FRIENDSHIP: 'Amizade',
  BOTH: 'Amizade e cruzamento',
}
