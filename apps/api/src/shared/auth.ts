import { createHash, randomBytes } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { jwtVerify, SignJWT } from 'jose'
import type { Role } from '../generated/prisma/client'
import { forbidden, unauthorized } from './errors'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_COOKIE = 'tinpet_rt'
export const REFRESH_COOKIE_PATH = '/api/v1/auth'

export interface AuthUser {
  id: string
  role: Role
}

export class TokenService {
  private readonly key: Uint8Array

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret)
  }

  sign(user: AuthUser): Promise<string> {
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.key)
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] })
      if (!payload.sub || typeof payload.role !== 'string') throw new Error('payload inválido')
      return { id: payload.sub, role: payload.role as Role }
    } catch {
      throw unauthorized('Sessão expirada ou inválida')
    }
  }
}

/** Refresh token opaco: o cliente recebe o valor, o banco guarda só o hash. */
export function newOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function requireRole(user: AuthUser, ...roles: Role[]) {
  if (!roles.includes(user.role)) throw forbidden()
}
