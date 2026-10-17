import {
  idParamsSchema,
  vaccineInputSchema,
  vaccineReminderSchema,
  vaccineSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createHealthService } from './service'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createHealthService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['health'], security: [{ bearer: [] }] }

  app.get(
    '/pets/:id/vaccines',
    { schema: { ...base, params: idParamsSchema, response: { 200: z.array(vaccineSchema) } } },
    (request) => service.list(request.auth, request.params.id),
  )

  app.post(
    '/pets/:id/vaccines',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: vaccineInputSchema,
        response: { 201: vaccineSchema },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await service.add(request.auth, request.params.id, request.body)),
  )

  app.delete(
    '/vaccines/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.remove(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me/vaccine-reminders',
    { schema: { ...base, response: { 200: z.array(vaccineReminderSchema) } } },
    (request) => service.reminders(request.auth),
  )
}
