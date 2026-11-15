import {
  mfaCodeSchema,
  recoveryCodesSchema,
  twoFactorDisableSchema,
  twoFactorEnableSchema,
  twoFactorSetupSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createMfaService } from './service'

/** Configuração do 2FA pela própria pessoa (Configurações → Segurança). */
export const mfaRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createMfaService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['mfa'], security: [{ bearer: [] }] }
  const limited = { rateLimit: { max: 10, timeWindow: '1 minute' } }

  app.post(
    '/setup',
    { config: limited, schema: { ...base, response: { 200: twoFactorSetupSchema } } },
    (request) => service.setup(request.auth),
  )

  app.post(
    '/enable',
    {
      config: limited,
      schema: { ...base, body: twoFactorEnableSchema, response: { 200: recoveryCodesSchema } },
    },
    (request) => service.enable(request.auth, request.body.code),
  )

  app.post(
    '/disable',
    {
      config: limited,
      schema: { ...base, body: twoFactorDisableSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.disable(request.auth, request.body.password, request.body.code)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/recovery-codes',
    {
      config: limited,
      schema: {
        ...base,
        body: z.object({ code: mfaCodeSchema }),
        response: { 200: recoveryCodesSchema },
      },
    },
    (request) => service.regenerateRecoveryCodes(request.auth, request.body.code),
  )
}
