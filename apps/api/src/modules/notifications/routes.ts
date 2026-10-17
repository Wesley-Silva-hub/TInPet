import {
  notificationSchema,
  notificationsQuerySchema,
  pageSchema,
  unreadCountSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createNotifier } from './service'

export const notificationRoutes: FastifyPluginAsyncZod = async (app) => {
  const notifier = createNotifier(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['notifications'], security: [{ bearer: [] }] }

  app.get(
    '/',
    {
      schema: {
        ...base,
        querystring: notificationsQuerySchema,
        response: { 200: pageSchema(notificationSchema) },
      },
    },
    (request) => notifier.list(request.auth.id, request.query),
  )

  app.get(
    '/unread-count',
    { schema: { ...base, response: { 200: unreadCountSchema } } },
    (request) => notifier.unreadCount(request.auth.id),
  )

  app.post(
    '/read-all',
    { schema: { ...base, response: { 204: z.null() } } },
    async (request, reply) => {
      await notifier.readAll(request.auth.id)
      return reply.status(204).send(null)
    },
  )
}
