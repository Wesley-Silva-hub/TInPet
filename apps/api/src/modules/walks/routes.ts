import {
  idParamsSchema,
  speciesSchema,
  walkerProfileInputSchema,
  walkerSchema,
  walkRequestInputSchema,
  walkResponseInputSchema,
  walkSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createWalkService } from './service'

export const walkRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createWalkService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['walks'], security: [{ bearer: [] }] }

  app.get(
    '/walkers',
    {
      schema: {
        ...base,
        querystring: z.object({ species: speciesSchema.optional() }),
        response: { 200: z.array(walkerSchema) },
      },
    },
    (request) => service.listNearby(request.auth, request.query.species),
  )

  app.get(
    '/walkers/me',
    { schema: { ...base, response: { 200: walkerSchema.nullable() } } },
    (request) => service.myProfile(request.auth),
  )

  app.put(
    '/walkers/me',
    { schema: { ...base, body: walkerProfileInputSchema, response: { 200: walkerSchema } } },
    (request) => service.saveProfile(request.auth, request.body),
  )

  app.get(
    '/walkers/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: walkerSchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.get('/walks', { schema: { ...base, response: { 200: z.array(walkSchema) } } }, (request) =>
    service.listMine(request.auth),
  )

  app.post(
    '/walks',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
      schema: { ...base, body: walkRequestInputSchema, response: { 201: walkSchema } },
    },
    async (request, reply) =>
      reply.status(201).send(await service.request(request.auth, request.body)),
  )

  const respond = {
    schema: {
      ...base,
      params: idParamsSchema,
      body: walkResponseInputSchema,
      response: { 200: walkSchema },
    },
  }
  app.post('/walks/:id/accept', respond, (request) =>
    service.accept(request.auth, request.params.id, request.body.note),
  )
  app.post('/walks/:id/decline', respond, (request) =>
    service.decline(request.auth, request.params.id, request.body.note),
  )

  const simple = { schema: { ...base, params: idParamsSchema, response: { 200: walkSchema } } }
  app.post('/walks/:id/cancel', simple, (request) =>
    service.cancel(request.auth, request.params.id),
  )
  app.post('/walks/:id/done', simple, (request) =>
    service.complete(request.auth, request.params.id),
  )
}
