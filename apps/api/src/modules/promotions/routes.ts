import {
  couponRevealSchema,
  idParamsSchema,
  myPromotionSchema,
  promotionEventSchema,
  promotionInputSchema,
  promotionSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createPromotionService } from './service'

export const promotionRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createPromotionService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['promotions'], security: [{ bearer: [] }] }

  app.get(
    '/for-you',
    { schema: { ...base, response: { 200: z.array(promotionSchema) } } },
    (request) => service.forYou(request.auth),
  )

  app.get(
    '/mine',
    { schema: { ...base, response: { 200: z.array(myPromotionSchema) } } },
    (request) => service.listMine(request.auth),
  )

  app.post(
    '/',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: { ...base, body: promotionInputSchema, response: { 201: myPromotionSchema } },
    },
    async (request, reply) =>
      reply.status(201).send(await service.create(request.auth, request.body)),
  )

  app.patch(
    '/:id',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: z.object({ paused: z.boolean() }),
        response: { 200: myPromotionSchema },
      },
    },
    (request) => service.setPaused(request.auth, request.params.id, request.body.paused),
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
    '/:id/events',
    {
      config: { rateLimit: { max: 240, timeWindow: '1 minute' } },
      schema: {
        ...base,
        params: idParamsSchema,
        body: promotionEventSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.recordEvent(request.auth, request.params.id, request.body.type)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/:id/coupon',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { ...base, params: idParamsSchema, response: { 200: couponRevealSchema } },
    },
    (request) => service.revealCoupon(request.auth, request.params.id),
  )
}
