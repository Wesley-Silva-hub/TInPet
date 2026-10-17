import { randomUUID } from 'node:crypto'
import type { registerSchema } from '@tinpet/shared'
import argon2 from 'argon2'
import type { z } from 'zod'
import { hashToken, newOpaqueToken, REFRESH_TOKEN_TTL_MS } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { meInclude, toMe } from '../../shared/dto'
import { AppError, conflict, isUniqueViolation, unauthorized } from '../../shared/errors'

/** Janela em que um refresh token recém-rotacionado ainda é tolerado (requisições simultâneas). */
const ROTATION_GRACE_MS = 30_000

// Hash fixo usado para gastar o mesmo tempo quando o e-mail não existe (evita enumeração por timing).
let dummyHash: Promise<string> | undefined

type RegisterData = z.output<typeof registerSchema>

export function createAuthService({ db, storage, tokens }: AppDeps) {
  async function startSession(userId: string, familyId?: string) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: meInclude })
    const refresh = newOpaqueToken()
    await db.refreshToken.create({
      data: {
        userId,
        familyId: familyId ?? randomUUID(),
        tokenHash: refresh.hash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })
    return {
      accessToken: await tokens.sign({ id: user.id, role: user.role }),
      refreshToken: refresh.token,
      user: toMe(user, storage),
    }
  }

  return {
    async register(input: RegisterData) {
      const now = new Date()
      try {
        const user = await db.user.create({
          data: {
            email: input.email,
            passwordHash: await argon2.hash(input.password),
            name: input.name,
            birthDate: new Date(`${input.birthDate}T00:00:00Z`),
            role: input.role,
            consentTermsAt: now,
            consentLocationAt: input.acceptLocation ? now : null,
            company:
              input.role === 'COMPANY' && input.company
                ? {
                    create: {
                      tradeName: input.company.tradeName,
                      cnpj: input.company.cnpj,
                      phone: input.company.phone,
                      website: input.company.website,
                    },
                  }
                : undefined,
          },
        })
        return startSession(user.id)
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict('ACCOUNT_EXISTS', 'Já existe uma conta com este e-mail ou CNPJ')
        }
        throw error
      }
    },

    async login(email: string, password: string) {
      const user = await db.user.findUnique({ where: { email } })
      if (!user) {
        dummyHash ??= argon2.hash('senha-inexistente')
        await argon2.verify(await dummyHash, password)
        throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos')
      }
      if (!(await argon2.verify(user.passwordHash, password))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos')
      }
      return startSession(user.id)
    },

    /** Rotaciona o refresh token. Reuso de token já rotacionado revoga a família inteira. */
    async refresh(token: string | undefined) {
      if (!token) throw unauthorized('Sessão expirada')
      const stored = await db.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } })
      if (!stored || stored.expiresAt < new Date()) throw unauthorized('Sessão expirada')

      if (stored.revokedAt) {
        const recentlyRotated = Date.now() - stored.revokedAt.getTime() < ROTATION_GRACE_MS
        if (!recentlyRotated) {
          await db.refreshToken.updateMany({
            where: { familyId: stored.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
        }
        throw unauthorized('Sessão expirada')
      }

      // Atualização condicional: só uma requisição concorrente consegue rotacionar
      const claimed = await db.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      if (claimed.count === 0) throw unauthorized('Sessão expirada')
      return startSession(stored.userId, stored.familyId)
    },

    async logout(token: string | undefined) {
      if (!token) return
      const stored = await db.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } })
      if (!stored) return
      await db.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    },
  }
}
