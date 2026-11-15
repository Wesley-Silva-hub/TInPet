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

/** Validade do link de "esqueci minha senha". */
export const PASSWORD_RESET_TTL_MINUTES = 30

export const forgotPasswordSchema = z.object({ email: emailSchema })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/** Login de conta com 2FA: a senha confere e falta o código do app autenticador. */
export const mfaChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  /** Vale 5 minutos e só serve para a segunda etapa. */
  mfaToken: z.string(),
})
export type MfaChallenge = z.infer<typeof mfaChallengeSchema>

export const loginResponseSchema = z.union([authResponseSchema, mfaChallengeSchema])
export type LoginResponse = z.infer<typeof loginResponseSchema>

/** Código de 6 dígitos do app ou um código de recuperação (XXXXX-XXXXX). */
export const mfaCodeSchema = z
  .string()
  .trim()
  .min(6, 'Digite o código de 6 dígitos')
  .max(20, 'Código inválido')

export const mfaLoginSchema = z.object({
  mfaToken: z.string().min(10).max(2000),
  code: mfaCodeSchema,
})
export type MfaLoginInput = z.infer<typeof mfaLoginSchema>

export const twoFactorSetupSchema = z.object({
  /** Para digitar no app se a câmera não ler o QR. */
  secret: z.string(),
  otpauthUrl: z.string(),
})
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>

export const twoFactorEnableSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Digite os 6 dígitos do app'),
})

export const recoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()) })
export type RecoveryCodes = z.infer<typeof recoveryCodesSchema>

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, 'Informe a senha').max(128),
  code: mfaCodeSchema,
})
