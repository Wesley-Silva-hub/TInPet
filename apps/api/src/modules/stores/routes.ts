import {
  idParamsSchema,
  meSchema,
  storeProfileInputSchema,
  storeReviewInputSchema,
  storeReviewsSchema,
  storeSummarySchema,
  storesQuerySchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createReviewService } from './reviews'
import { createStoreService } from './service'

export const storeRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createStoreService(app.deps)
  const reviews = createReviewService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['stores'], security: [{ bearer: [] }] }

  app.get(
    '/stores',
    {
      schema: {
        ...base,
        querystring: storesQuerySchema,
        response: { 200: z.array(storeSummarySchema) },
      },
    },
    (request) => service.list(request.auth, request.query),
  )

  app.get(
    '/stores/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: storeSummarySchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.put(
    '/me/store',
    { schema: { ...base, body: storeProfileInputSchema, response: { 200: meSchema } } },
    (request) => service.updateProfile(request.auth, request.body),
  )

  app.get(
    '/stores/:id/reviews',
    { schema: { ...base, params: idParamsSchema, response: { 200: storeReviewsSchema } } },
    (request) => reviews.list(request.auth, request.params.id),
  )

  app.put(
    '/stores/:id/reviews/mine',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
      schema: {
        ...base,
        params: idParamsSchema,
        body: storeReviewInputSchema,
        response: { 200: storeReviewsSchema },
      },
    },
    (request) => reviews.upsert(request.auth, request.params.id, request.body),
  )

  app.delete(
    '/stores/:id/reviews/mine',
    { schema: { ...base, params: idParamsSchema, response: { 200: storeReviewsSchema } } },
    (request) => reviews.remove(request.auth, request.params.id),
  )
}
