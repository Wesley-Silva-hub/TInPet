import { idParamsSchema, reportInputSchema } from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createSafetyService } from './service'

export const safetyRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createSafetyService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['safety'], security: [{ bearer: [] }], params: idParamsSchema }

  app.post(
    '/users/:id/block',
    { schema: { ...base, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.block(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/users/:id/block',
    { schema: { ...base, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.unblock(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/users/:id/report',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
      schema: { ...base, body: reportInputSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.report(request.auth, request.params.id, request.body)
      return reply.status(204).send(null)
    },
  )
}
