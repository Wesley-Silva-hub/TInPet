import {
  idParamsSchema,
  moderationReportSchema,
  moderationReportsQuerySchema,
  pageSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createModerationService } from './service'

export const moderationRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createModerationService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['moderation'], security: [{ bearer: [] }] }

  app.get(
    '/reports',
    {
      schema: {
        ...base,
        querystring: moderationReportsQuerySchema,
        response: { 200: pageSchema(moderationReportSchema) },
      },
    },
    (request) => service.listReports(request.auth, request.query),
  )

  app.post(
    '/reports/:id/resolve',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.resolveReport(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/users/:id/suspend',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.suspend(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/users/:id/suspend',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.reactivate(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
