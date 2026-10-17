import { z } from 'zod'
import { ageFrom, isoDateSchema } from './common'

export const MIN_USER_AGE = 18

export const roles = ['OWNER', 'COMPANY', 'ADMIN'] as const
export const roleSchema = z.enum(roles)
export type Role = z.infer<typeof roleSchema>

export const brazilianStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const nameSchema = z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(80)

export const birthDateSchema = isoDateSchema.refine((value) => ageFrom(value) >= MIN_USER_AGE, {
  message: `É preciso ter pelo menos ${MIN_USER_AGE} anos`,
})

export const updateProfileSchema = z.object({
  name: nameSchema,
  bio: z.string().trim().max(500).default(''),
  birthDate: birthDateSchema,
  maritalStatusId: z.number().int().positive().nullable(),
  professionId: z.number().int().positive().nullable(),
  city: z.string().trim().max(80).nullable(),
  state: z.enum(brazilianStates).nullable(),
})
export type UpdateProfileInput = z.input<typeof updateProfileSchema>

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})
export type LocationInput = z.infer<typeof locationSchema>

export const lookupItemSchema = z.object({ id: z.number().int(), name: z.string() })
export type LookupItem = z.infer<typeof lookupItemSchema>

export const companyProfileSchema = z.object({
  tradeName: z.string().trim().min(2).max(120),
  cnpj: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().length(14, 'CNPJ deve ter 14 dígitos')),
  phone: z.string().trim().max(20).nullable().default(null),
  website: z.url().max(300).nullable().default(null),
})
export type CompanyProfileInput = z.input<typeof companyProfileSchema>

/** Dados do próprio usuário (nunca usado para expor terceiros). */
export const meSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  birthDate: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  maritalStatus: lookupItemSchema.nullable(),
  profession: lookupItemSchema.nullable(),
  hasLocation: z.boolean(),
  consentLocationAt: z.string().nullable(),
  company: companyProfileSchema
    .extend({ cnpj: z.string(), phone: z.string().nullable(), website: z.string().nullable() })
    .nullable(),
})
export type Me = z.infer<typeof meSchema>

/** Perfil público de outro dono: sem e-mail, sem data de nascimento exata, sem coordenadas. */
export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  age: z.number().int(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  maritalStatus: z.string().nullable(),
  profession: z.string().nullable(),
})
export type PublicUser = z.infer<typeof publicUserSchema>
