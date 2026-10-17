import {
  commentInputSchema,
  commentSchema,
  commentsQuerySchema,
  idParamsSchema,
  likeResultSchema,
  pageSchema,
  postFieldsSchema,
  postSchema,
  postsQuerySchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppError } from '../../shared/errors'
import { readUpload } from '../../shared/images'
import { createSocialService } from './service'

/** Campos de texto do multipart chegam como { value }; só os que vêm antes do arquivo. */
function multipartFields(fields: Record<string, unknown> | undefined) {
  const read = (name: string) => {
    const field = fields?.[name] as { value?: unknown } | undefined
    return typeof field?.value === 'string' && field.value !== '' ? field.value : undefined
  }
  const parsed = postFieldsSchema.safeParse({ caption: read('caption'), petId: read('petId') })
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.issues)
  }
  return parsed.data
}

export const socialRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createSocialService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['social'], security: [{ bearer: [] }] }

  app.get(
    '/posts',
    {
      schema: { ...base, querystring: postsQuerySchema, response: { 200: pageSchema(postSchema) } },
    },
    (request) => service.list(request.auth, request.query),
  )

  app.get(
    '/posts/trending',
    { schema: { ...base, response: { 200: z.array(postSchema) } } },
    (request) => service.trending(request.auth),
  )

  app.post(
    '/posts',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: { ...base, consumes: ['multipart/form-data'], response: { 201: postSchema } },
    },
    async (request, reply) => {
      const upload = await request.file()
      const fields = multipartFields(upload?.fields as Record<string, unknown> | undefined)
      const post = await service.create(request.auth, await readUpload(upload), fields)
      return reply.status(201).send(post)
    },
  )

  app.get(
    '/posts/:id',
    { schema: { ...base, params: idParamsSchema, response: { 200: postSchema } } },
    (request) => service.get(request.auth, request.params.id),
  )

  app.delete(
    '/posts/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.remove(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.put(
    '/posts/:id/like',
    { schema: { ...base, params: idParamsSchema, response: { 200: likeResultSchema } } },
    (request) => service.like(request.auth, request.params.id),
  )

  app.delete(
    '/posts/:id/like',
    { schema: { ...base, params: idParamsSchema, response: { 200: likeResultSchema } } },
    (request) => service.unlike(request.auth, request.params.id),
  )

  app.get(
    '/posts/:id/comments',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        querystring: commentsQuerySchema,
        response: { 200: pageSchema(commentSchema) },
      },
    },
    (request) => service.comments(request.auth, request.params.id, request.query),
  )

  app.post(
    '/posts/:id/comments',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        ...base,
        params: idParamsSchema,
        body: commentInputSchema,
        response: { 201: commentSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(await service.comment(request.auth, request.params.id, request.body.content)),
  )

  app.delete(
    '/comments/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.removeComment(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
