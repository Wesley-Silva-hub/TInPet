import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authRoutes } from './modules/auth/routes'
import { chatRoutes } from './modules/chat/routes'
import { registerChatSocket } from './modules/chat/socket'
import { healthRoutes } from './modules/health/routes'
import { matchingRoutes } from './modules/matching/routes'
import { newsRoutes } from './modules/news/routes'
import { notificationRoutes } from './modules/notifications/routes'
import { petRoutes } from './modules/pets/routes'
import { productRoutes } from './modules/products/routes'
import { safetyRoutes } from './modules/safety/routes'
import { socialRoutes } from './modules/social/routes'
import { userRoutes } from './modules/users/routes'
import { TokenService } from './shared/auth'
import { type AppDeps, registerAuthentication } from './shared/context'
import { type Env, isProduction } from './shared/env'
import { registerErrorHandler } from './shared/errors'
import { MAX_UPLOAD_BYTES } from './shared/images'
import type { Db } from './shared/prisma'
import { createRealtime } from './shared/realtime'
import { LOCAL_FILES_ROUTE, LocalStorageProvider } from './shared/storage/local'
import type { StorageProvider } from './shared/storage/storage'

export interface BuildAppOptions {
  env: Env
  db: Db
  storage: StorageProvider
}

function loggerOptions(env: Env): FastifyServerOptions['logger'] {
  return {
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    // Nunca logar credenciais nem cookies
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    ...(env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
    }),
  }
}

/** Monta a aplicação sem abrir porta (usado pelo server.ts e pelos testes). */
export async function buildApp({ env, db, storage }: BuildAppOptions) {
  const app = Fastify({
    logger: loggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const tokens = new TokenService(env.JWT_SECRET)
  const { io, realtime } = createRealtime(app.server, tokens, env.CORS_ORIGINS)
  const deps: AppDeps = { env, db, storage, tokens, realtime }
  app.decorate('deps', deps)
  app.addHook('onClose', async () => {
    await io.close()
  })

  registerErrorHandler(app)
  registerAuthentication(app)

  await app.register(helmet, { crossOriginResourcePolicy: { policy: 'cross-origin' } })
  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true })
  await app.register(cookie)
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } })

  const docsEnabled = env.API_DOCS ?? !isProduction(env)
  if (docsEnabled) {
    await app.register(swagger, {
      openapi: {
        info: { title: 'TinPet API', version: '1.0.0' },
        components: {
          securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
        },
      },
      transform: jsonSchemaTransform,
    })
    await app.register(swaggerUi, { routePrefix: '/api/docs', staticCSP: true })
  }

  app.get(
    '/api/v1/health',
    {
      schema: {
        tags: ['infra'],
        response: { 200: z.object({ status: z.literal('ok') }), 503: z.unknown() },
      },
    },
    async (request, reply) => {
      try {
        await db.$queryRaw`SELECT 1`
        return { status: 'ok' as const }
      } catch (error) {
        request.log.error({ err: error }, 'banco indisponível')
        return reply
          .status(503)
          .send({ error: { code: 'DB_UNAVAILABLE', message: 'Banco indisponível' } })
      }
    },
  )

  if (storage instanceof LocalStorageProvider) {
    app.get(`${LOCAL_FILES_ROUTE}/*`, { schema: { hide: true } }, async (request, reply) => {
      const key = (request.params as { '*': string })['*']
      const path = storage.resolveKey(key)
      const info = path ? await stat(path).catch(() => null) : null
      if (!path || !info?.isFile()) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Arquivo não encontrado' } })
      }
      return reply
        .type('image/webp')
        .header('cache-control', 'public, max-age=31536000, immutable')
        .send(createReadStream(path))
    })
  }

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' })
      await api.register(userRoutes)
      await api.register(petRoutes, { prefix: '/pets' })
      await api.register(matchingRoutes)
      await api.register(chatRoutes)
      await api.register(safetyRoutes)
      await api.register(productRoutes, { prefix: '/products' })
      await api.register(socialRoutes)
      await api.register(newsRoutes)
      await api.register(healthRoutes)
      await api.register(notificationRoutes, { prefix: '/notifications' })
    },
    { prefix: '/api/v1' },
  )

  registerChatSocket(io, deps)

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
