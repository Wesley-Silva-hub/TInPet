import {
  healthRecordInputSchema,
  healthRecordSchema,
  idParamsSchema,
  medicationInputSchema,
  medicationSchema,
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
    '/pets/:id/medications',
    { schema: { ...base, params: idParamsSchema, response: { 200: z.array(medicationSchema) } } },
    (request) => service.listMedications(request.auth, request.params.id),
  )

  app.post(
    '/pets/:id/medications',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: medicationInputSchema,
        response: { 201: medicationSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(await service.addMedication(request.auth, request.params.id, request.body)),
  )

  app.post(
    '/medications/:id/finish',
    { schema: { ...base, params: idParamsSchema, response: { 200: medicationSchema } } },
    (request) => service.finishMedication(request.auth, request.params.id),
  )

  app.delete(
    '/medications/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.removeMedication(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/pets/:id/health-records',
    {
      schema: { ...base, params: idParamsSchema, response: { 200: z.array(healthRecordSchema) } },
    },
    (request) => service.listRecords(request.auth, request.params.id),
  )

  app.post(
    '/pets/:id/health-records',
    {
      schema: {
        ...base,
        params: idParamsSchema,
        body: healthRecordInputSchema,
        response: { 201: healthRecordSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(await service.addRecord(request.auth, request.params.id, request.body)),
  )

  app.delete(
    '/health-records/:id',
    { schema: { ...base, params: idParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.removeRecord(request.auth, request.params.id)
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me/vaccine-reminders',
    { schema: { ...base, response: { 200: z.array(vaccineReminderSchema) } } },
    (request) => service.reminders(request.auth),
  )
}
