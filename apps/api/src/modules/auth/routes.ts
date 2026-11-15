import {
  authResponseSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@tinpet/shared'
import type { FastifyReply } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL_MS } from '../../shared/auth'
import { isProduction } from '../../shared/env'
import { createAuthService } from './service'

const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } }

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createAuthService(app.deps)
  const { env } = app.deps

  const setRefreshCookie = (reply: FastifyReply, token: string) =>
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProduction(env),
      sameSite: env.COOKIE_SAMESITE,
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_TTL_MS / 1000,
    })

  app.post(
    '/register',
    {
      config: authRateLimit,
      schema: { tags: ['auth'], body: registerSchema, response: { 201: authResponseSchema } },
    },
    async (request, reply) => {
      const { refreshToken, ...session } = await service.register(request.body)
      setRefreshCookie(reply, refreshToken)
      return reply.status(201).send(session)
    },
  )

  app.post(
    '/login',
    {
      config: authRateLimit,
      schema: { tags: ['auth'], body: loginSchema, response: { 200: authResponseSchema } },
    },
    async (request, reply) => {
      const { refreshToken, ...session } = await service.login(
        request.body.email,
        request.body.password,
      )
      setRefreshCookie(reply, refreshToken)
      return session
    },
  )

  app.post(
    '/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { tags: ['auth'], response: { 200: authResponseSchema } },
    },
    async (request, reply) => {
      const { refreshToken, ...session } = await service.refresh(request.cookies[REFRESH_COOKIE])
      setRefreshCookie(reply, refreshToken)
      return session
    },
  )

  app.post(
    '/logout',
    { schema: { tags: ['auth'], response: { 204: z.null() } } },
    async (request, reply) => {
      await service.logout(request.cookies[REFRESH_COOKIE])
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/forgot-password',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'], body: forgotPasswordSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.forgotPassword(request.body.email, (error) =>
        request.log.error({ err: error }, 'falha ao enviar e-mail de redefinição'),
      )
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/reset-password',
    {
      config: authRateLimit,
      schema: { tags: ['auth'], body: resetPasswordSchema, response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.resetPassword(request.body.token, request.body.password)
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/logout-all',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { tags: ['auth'], security: [{ bearer: [] }], response: { 204: z.null() } },
    },
    async (request, reply) => {
      await service.logoutAll(request.auth.id)
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
      return reply.status(204).send(null)
    },
  )
}
