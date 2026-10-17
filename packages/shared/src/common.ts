import { z } from 'zod'

export const uuidSchema = z.uuid()
export const idParamsSchema = z.object({ id: z.uuid() })

/** Data no formato YYYY-MM-DD. */
export const isoDateSchema = z.iso.date()

export const paginationQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() })
}

export type Page<T> = { items: T[]; nextCursor: string | null }

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

/** Idade completa em anos numa data de referência. */
export function ageFrom(birthDate: string | Date, now = new Date()): number {
  const birth = typeof birthDate === 'string' ? new Date(`${birthDate}T00:00:00Z`) : birthDate
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age--
  return age
}
