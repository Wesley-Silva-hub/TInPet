import { idParamsSchema, petInputSchema, petSchema, petUpdateSchema } from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { readUpload } from '../../shared/images'
import { createPetService } from './service'

export const petRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createPetService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['pets'], security: [{ bearer: [] }] }

  app.get('/mine', { schema: { ...base, response: { 200: z.array(petSchema) } } }, (request) =>
    service.listMine(request.auth),
  )

  app.post(
    '/',
    { schema: { ...base, body: petInputSchema, response: { 201: petSchema } } },
    async (request, reply) =>
      reply.status(201).send(await service.create(request.auth, request.body)),
  )

  app.get(
    '/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: petSchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.patch(
    '/:id',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: petUpdateSchema,
        response: { 200: petSchema },
      },
    },
    (request) => service.update(request.auth, request.params.id, request.body),
  )

  app.delete(
    '/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.remove(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/:id/photos',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        ...base,
        consumes: ['multipart/form-data'],
        params: idParamsSchema,
        response: { 201: petSchema },
      },
    },
    async (request, reply) => {
      const file = await readUpload(await request.file())
      return reply.status(201).send(await service.addPhoto(request.auth, request.params.id, file))
    },
  )

  app.delete(
    '/:id/photos/:photoId',
    {
      schema: {
        ...base,
        params: z.object({ id: z.uuid(), photoId: z.uuid() }),
        response: { 200: petSchema },
      },
    },
    (request) => service.removePhoto(request.auth, request.params.id, request.params.photoId),
  )
}
