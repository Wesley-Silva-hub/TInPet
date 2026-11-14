import {
  eventInputSchema,
  idParamsSchema,
  petEventDetailSchema,
  petEventSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createEventService } from './service'

export const eventRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createEventService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['events'], security: [{ bearer: [] }] }

  app.get('/', { schema: { ...base, response: { 200: z.array(petEventSchema) } } }, (request) =>
    service.listUpcoming(request.auth),
  )

  app.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
      schema: {
        ...base,
        body: eventInputSchema,
        response: { 201: petEventDetailSchema.extend({ notified: z.number().int() }) },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await service.create(request.auth, request.body)),
  )

  app.get(
    '/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: petEventDetailSchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.post(
    '/:id/attend',
    { schema: { ...base, params: idParamsSchema, response: { 200: petEventDetailSchema } } },
    (request) => service.attend(request.auth, request.params.id),
  )

  app.delete(
    '/:id/attend',
    { schema: { ...base, params: idParamsSchema, response: { 200: petEventDetailSchema } } },
    (request) => service.unattend(request.auth, request.params.id),
  )

  app.post(
    '/:id/cancel',
    { schema: { ...base, params: idParamsSchema, response: { 200: petEventDetailSchema } } },
    (request) => service.cancel(request.auth, request.params.id),
  )
}
