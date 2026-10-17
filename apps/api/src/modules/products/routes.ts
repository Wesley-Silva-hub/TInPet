import {
  idParamsSchema,
  pageSchema,
  productInputSchema,
  productSchema,
  productsQuerySchema,
  productUpdateSchema,
  recommendedProductSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { readUpload } from '../../shared/images'
import { createProductService } from './service'

export const productRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createProductService(app.deps)
  const tags = ['products']
  const secured = { onRequest: [app.authenticate] }
  const security = [{ bearer: [] }]

  app.get(
    '/',
    {
      schema: {
        tags,
        querystring: productsQuerySchema,
        response: { 200: pageSchema(productSchema) },
      },
    },
    async (request) => service.list(await app.viewer(request), request.query),
  )

  app.get(
    '/recommended',
    {
      ...secured,
      schema: { tags, security, response: { 200: z.array(recommendedProductSchema) } },
    },
    (request) => service.recommended(request.auth),
  )

  app.get(
    '/mine',
    { ...secured, schema: { tags, security, response: { 200: z.array(productSchema) } } },
    (request) => service.listMine(request.auth),
  )

  app.get(
    '/:id',
    { schema: { tags, params: idParamsSchema, response: { 200: productSchema } } },
    async (request) => service.get(await app.viewer(request), request.params.id),
  )

  app.post(
    '/',
    {
      ...secured,
      schema: { tags, security, body: productInputSchema, response: { 201: productSchema } },
    },
    async (request, reply) =>
      reply.status(201).send(await service.create(request.auth, request.body)),
  )

  app.patch(
    '/:id',
    {
      ...secured,
      schema: {
        tags,
        security,
        params: idParamsSchema,
        body: productUpdateSchema,
        response: { 200: productSchema },
      },
    },
    (request) => service.update(request.auth, request.params.id, request.body),
  )

  app.delete(
    '/:id',
    { ...secured, schema: { tags, security, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.remove(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.put(
    '/:id/image',
    {
      ...secured,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags,
        security,
        consumes: ['multipart/form-data'],
        params: idParamsSchema,
        response: { 200: productSchema },
      },
    },
    async (request) =>
      service.setImage(request.auth, request.params.id, await readUpload(await request.file())),
  )
}
