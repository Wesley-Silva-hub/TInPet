import {
  idParamsSchema,
  lostPetAlertDetailSchema,
  lostPetAlertInputSchema,
  lostPetAlertSummarySchema,
  petTagSchema,
  publicTagSchema,
  resolveLostPetSchema,
  sightingInputSchema,
  sightingSchema,
  tagCodeParamsSchema,
  tagFoundInputSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createLostPetService } from './service'

export const lostPetRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createLostPetService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['lost-pets'], security: [{ bearer: [] }] }

  app.get(
    '/lost-pets',
    { schema: { ...base, response: { 200: z.array(lostPetAlertSummarySchema) } } },
    (request) => service.listNearby(request.auth),
  )

  app.post(
    '/lost-pets',
    {
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
      schema: {
        ...base,
        body: lostPetAlertInputSchema,
        response: {
          201: lostPetAlertSummarySchema.extend({ notified: z.number().int() }),
        },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await service.create(request.auth, request.body)),
  )

  app.get(
    '/lost-pets/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: lostPetAlertDetailSchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.post(
    '/lost-pets/:id/sightings',
    {
      config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
      schema: {
        ...base,
        params: idParamsSchema,
        body: sightingInputSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.reportSighting(request.auth, request.params.id, request.body)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/lost-pets/:id/resolve',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: resolveLostPetSchema,
        response: { 200: lostPetAlertSummarySchema },
      },
    },
    (request) => service.resolve(request.auth, request.params.id, request.body.status),
  )

  app.post(
    '/pets/:id/tag',
    { schema: { ...base, params: idParamsSchema, response: { 200: petTagSchema } } },
    (request) => service.tagFor(request.auth, request.params.id),
  )

  app.get(
    '/pets/:id/tag-reports',
    { schema: { ...base, params: idParamsSchema, response: { 200: z.array(sightingSchema) } } },
    (request) => service.tagReports(request.auth, request.params.id),
  )
}

/** Plaquinha QR: aberta, porque quem acha o pet geralmente não tem o app. */
export const publicTagRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createLostPetService(app.deps)
  const base = { tags: ['lost-pets'] }

  app.get(
    '/tags/:code',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { ...base, params: tagCodeParamsSchema, response: { 200: publicTagSchema } },
    },
    (request) => service.publicTag(request.params.code),
  )

  app.post(
    '/tags/:code/found',
    {
      // Aberto ao público: limite apertado contra abuso
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        ...base,
        params: tagCodeParamsSchema,
        body: tagFoundInputSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.foundByTag(request.params.code, request.body)
      return reply.status(204).send(null)
    },
  )
}
