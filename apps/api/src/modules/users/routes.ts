import {
  breedSchema,
  idParamsSchema,
  locationSchema,
  lookupItemSchema,
  meSchema,
  petSchema,
  publicUserSchema,
  updateProfileSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from '../../shared/auth'
import { readUpload } from '../../shared/images'
import { createUserService } from './service'

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createUserService(app.deps)
  const secured = { onRequest: [app.authenticate] }
  const security = [{ bearer: [] }]

  app.get(
    '/lookups',
    {
      schema: {
        tags: ['users'],
        response: {
          200: z.object({
            maritalStatuses: z.array(lookupItemSchema),
            professions: z.array(lookupItemSchema),
            breeds: z.array(breedSchema),
          }),
        },
      },
    },
    () => service.lookups(),
  )

  app.get(
    '/me',
    { ...secured, schema: { tags: ['users'], security, response: { 200: meSchema } } },
    (request) => service.getMe(request.auth.id),
  )

  app.put(
    '/me',
    {
      ...secured,
      schema: { tags: ['users'], security, body: updateProfileSchema, response: { 200: meSchema } },
    },
    (request) => service.updateProfile(request.auth.id, request.body),
  )

  app.put(
    '/me/location',
    {
      ...secured,
      schema: { tags: ['users'], security, body: locationSchema, response: { 200: meSchema } },
    },
    (request) => service.setLocation(request.auth.id, request.body),
  )

  app.delete(
    '/me/location',
    { ...secured, schema: { tags: ['users'], security, response: { 200: meSchema } } },
    (request) => service.clearLocation(request.auth.id),
  )

  app.put(
    '/me/avatar',
    {
      ...secured,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        tags: ['users'],
        security,
        consumes: ['multipart/form-data'],
        response: { 200: meSchema },
      },
    },
    async (request) => service.setAvatar(request.auth.id, await readUpload(await request.file())),
  )

  app.get(
    '/me/export',
    {
      ...secured,
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { tags: ['users'], security },
    },
    async (request, reply) => {
      const data = await service.exportData(request.auth.id)
      return reply
        .header('content-disposition', 'attachment; filename="meus-dados-tinpet.json"')
        .send(data)
    },
  )

  app.delete(
    '/me',
    {
      ...secured,
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['users'],
        security,
        body: z.object({ password: z.string().min(1).max(128) }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.deleteAccount(request.auth.id, request.body.password)
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/users/:id',
    {
      ...secured,
      schema: {
        tags: ['users'],
        security,
        params: idParamsSchema,
        response: { 200: z.object({ user: publicUserSchema, pets: z.array(petSchema) }) },
      },
    },
    (request) => service.getPublicProfile(request.auth.id, request.params.id),
  )
}
