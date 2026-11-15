import { pushConfigSchema, pushSubscriptionInputSchema } from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createPushService } from './service'

export const pushRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createPushService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['push'], security: [{ bearer: [] }] }

  app.get('/config', { schema: { ...base, response: { 200: pushConfigSchema } } }, () =>
    service.config(),
  )

  app.post(
    '/subscriptions',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
      schema: { ...base, body: pushSubscriptionInputSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.subscribe(request.auth, request.body)
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/subscriptions',
    {
      schema: {
        ...base,
        body: z.object({ endpoint: z.string().max(2000) }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.unsubscribe(request.auth, request.body.endpoint)
      return reply.status(204).send(null)
    },
  )
}
