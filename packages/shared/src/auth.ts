import { z } from 'zod'
import { birthDateSchema, companyProfileSchema, meSchema } from './users'

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(128, 'Senha longa demais')

const emailSchema = z.email('E-mail inválido').max(254).trim().toLowerCase()

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(80),
    email: emailSchema,
    password: passwordSchema,
    birthDate: birthDateSchema,
    role: z.enum(['OWNER', 'COMPANY']),
    acceptTerms: z.literal(true, { error: 'É preciso aceitar os termos de uso' }),
    acceptLocation: z.boolean(),
    company: companyProfileSchema.optional(),
  })
  .refine((data) => data.role !== 'COMPANY' || data.company, {
    message: 'Informe os dados da empresa',
    path: ['company'],
  })
export type RegisterInput = z.input<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha').max(128),
})
export type LoginInput = z.infer<typeof loginSchema>

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: meSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>
