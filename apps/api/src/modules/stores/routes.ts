import {
  idParamsSchema,
  meSchema,
  storeProfileInputSchema,
  storeSummarySchema,
  storesQuerySchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createStoreService } from './service'

export const storeRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createStoreService(app.deps)
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
}
