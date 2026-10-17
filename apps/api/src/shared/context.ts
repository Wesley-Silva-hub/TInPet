import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { type AuthUser, bearerToken, type TokenService } from './auth'
import type { Env } from './env'
import { unauthorized } from './errors'
import type { Db } from './prisma'
import type { Realtime } from './realtime'
import type { StorageProvider } from './storage/storage'

/** Dependências compartilhadas pelos módulos (injetadas em buildApp, substituíveis em testes). */
export interface AppDeps {
  env: Env
  db: Db
  storage: StorageProvider
  tokens: TokenService
  realtime: Realtime
}

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** Usuário logado, se houver token válido; rotas públicas usam para personalizar. */
    viewer: (request: FastifyRequest) => Promise<AuthUser | null>
  }
  interface FastifyRequest {
    auth: AuthUser
  }
}

export function registerAuthentication(app: FastifyInstance) {
  app.decorateRequest('auth', null as unknown as AuthUser)
  app.decorate('authenticate', async (request: FastifyRequest) => {
    const token = bearerToken(request)
    if (!token) throw unauthorized()
    request.auth = await app.deps.tokens.verify(token)
  })
  app.decorate('viewer', async (request: FastifyRequest) => {
    const token = bearerToken(request)
    if (!token) return null
    return app.deps.tokens.verify(token).catch(() => null)
  })
}
