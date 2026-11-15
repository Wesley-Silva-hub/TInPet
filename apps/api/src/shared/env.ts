import { z } from 'zod'

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')

/** Variável criada vazia no painel da plataforma vale como não definida. */
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const optionalString = z
  .string()
  .optional()
  .transform((value) => value || undefined)

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    TRUST_PROXY: booleanFromString.default(false),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    API_DOCS: booleanFromString.optional(),
    STORAGE_DRIVER: z.enum(['local', 'supabase', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('../../.data/uploads'),
    SUPABASE_URL: optionalString,
    SUPABASE_SERVICE_KEY: optionalString,
    SUPABASE_BUCKET: z.string().default('tinpet'),
    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('tinpet'),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString,
    /** file = grava o e-mail em arquivo (dev); resend = envia de verdade; none = desligado. */
    MAIL_DRIVER: z.preprocess(emptyToUndefined, z.enum(['file', 'resend', 'none']).optional()),
    MAIL_LOCAL_DIR: z.string().default('../../.data/mail'),
    MAIL_FROM: z.preprocess(emptyToUndefined, z.string().default('TinPet <onboarding@resend.dev>')),
    RESEND_API_KEY: optionalString,
    /** Endereço do site, usado nos links dos e-mails (nunca o Host da requisição). */
    APP_URL: z.preprocess(emptyToUndefined, z.url().default('http://localhost:5173')),
  })
  .superRefine((env, ctx) => {
    const require = (keys: (keyof typeof env)[]) => {
      for (const key of keys) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `obrigatória com STORAGE_DRIVER=${env.STORAGE_DRIVER}`,
          })
        }
      }
    }
    if (env.STORAGE_DRIVER === 'supabase') require(['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'])
    if (env.STORAGE_DRIVER === 's3') {
      require(['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'])
    }
    if (env.MAIL_DRIVER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'obrigatória com MAIL_DRIVER=resend',
      })
    }
    if (
      env.MAIL_DRIVER === 'resend' &&
      env.NODE_ENV === 'production' &&
      new URL(env.APP_URL).hostname === 'localhost'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'defina a URL do site (os links do e-mail apontariam para localhost)',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/** Valida as variáveis de ambiente; a aplicação não sobe com configuração inválida. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`)
  }
  return result.data
}

export const isProduction = (env: Env) => env.NODE_ENV === 'production'

/** Sem configuração: arquivo local em dev e desligado em produção (nunca finge que enviou). */
export const mailDriverOf = (env: Env) => env.MAIL_DRIVER ?? (isProduction(env) ? 'none' : 'file')
