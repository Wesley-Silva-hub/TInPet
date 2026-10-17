import {
  idParamsSchema,
  messageInputSchema,
  messageSchema,
  messagesQuerySchema,
  pageSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createChatService } from './service'

export const chatRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createChatService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['chat'], security: [{ bearer: [] }], params: idParamsSchema }

  app.get(
    '/matches/:id/messages',
    {
      schema: {
        ...base,
        querystring: messagesQuerySchema,
        response: { 200: pageSchema(messageSchema) },
      },
    },
    (request) => service.list(request.auth, request.params.id, request.query),
  )

  app.post(
    '/matches/:id/messages',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { ...base, body: messageInputSchema, response: { 201: messageSchema } },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(await service.send(request.auth, request.params.id, request.body.content)),
  )

  app.post(
    '/matches/:id/read',
    { schema: { ...base, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.markRead(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
