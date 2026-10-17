import {
  feedItemSchema,
  feedQuerySchema,
  idParamsSchema,
  matchSummarySchema,
  pageSchema,
  swipeInputSchema,
  swipeResultSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createMatchingService } from './service'

export const matchingRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createMatchingService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const security = [{ bearer: [] }]

  app.get(
    '/feed',
    {
      schema: {
        tags: ['matching'],
        security,
        querystring: feedQuerySchema,
        response: { 200: pageSchema(feedItemSchema) },
      },
    },
    (request) => service.feed(request.auth, request.query),
  )

  app.post(
    '/swipes',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      schema: {
        tags: ['matching'],
        security,
        body: swipeInputSchema,
        response: { 201: swipeResultSchema },
      },
    },
    async (request, reply) =>
      reply.status(201).send({ match: await service.swipe(request.auth, request.body) }),
  )

  app.get(
    '/matches',
    { schema: { tags: ['matching'], security, response: { 200: z.array(matchSummarySchema) } } },
    (request) => service.listMatches(request.auth),
  )

  app.delete(
    '/matches/:id',
    {
      schema: { tags: ['matching'], security, params: idParamsSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.unmatch(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
