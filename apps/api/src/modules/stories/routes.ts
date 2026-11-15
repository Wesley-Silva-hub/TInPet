import { idParamsSchema, storyFieldsSchema, storyGroupSchema } from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppError } from '../../shared/errors'
import { readUpload } from '../../shared/images'
import { createStoryService } from './service'

/** Campos de texto do multipart chegam como { value }; só os que vêm antes do arquivo. */
function storyFields(fields: Record<string, unknown> | undefined) {
  const read = (name: string) => {
    const field = fields?.[name] as { value?: unknown } | undefined
    return typeof field?.value === 'string' && field.value !== '' ? field.value : undefined
  }
  const parsed = storyFieldsSchema.safeParse({ caption: read('caption'), petId: read('petId') })
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.issues)
  }
  return parsed.data
}

export const storyRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createStoryService(app.deps)
  app.addHook('onRequest', app.authenticate)
  const base = { tags: ['stories'], security: [{ bearer: [] }] }

  app.get('/', { schema: { ...base, response: { 200: z.array(storyGroupSchema) } } }, (request) =>
    service.list(request.auth),
  )

  app.post(
    '/',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
      schema: {
        ...base,
        consumes: ['multipart/form-data'],
        response: { 201: z.object({ id: z.uuid(), expiresAt: z.string() }) },
      },
    },
    async (request, reply) => {
      const upload = await request.file()
      const fields = storyFields(upload?.fields as Record<string, unknown> | undefined)
      const story = await service.create(request.auth, await readUpload(upload), fields)
      return reply.status(201).send(story)
    },
  )

  app.post(
    '/:id/view',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.view(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.remove(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
