import { randomUUID } from 'node:crypto'
import { PASSWORD_RESET_TTL_MINUTES, type registerSchema } from '@tinpet/shared'
import argon2 from 'argon2'
import type { z } from 'zod'
import { hashToken, newOpaqueToken, REFRESH_TOKEN_TTL_MS } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { meInclude, toMe } from '../../shared/dto'
import {
  AppError,
  badRequest,
  conflict,
  isUniqueViolation,
  unauthorized,
} from '../../shared/errors'
import type { MailMessage } from '../../shared/mail'
import type { Db } from '../../shared/prisma'
import { createMfaService, invalidCode } from '../mfa/service'

/** Janela em que um refresh token recém-rotacionado ainda é tolerado (requisições simultâneas). */
const ROTATION_GRACE_MS = 30_000

/** Refresh tokens vencidos há mais que isso são apagados (não servem nem para detectar reuso). */
export const EXPIRED_TOKEN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export const accountSuspended = () =>
  new AppError(403, 'ACCOUNT_SUSPENDED', 'Esta conta foi suspensa por violar os termos de uso')

/** Apaga refresh tokens vencidos há mais de 30 dias e links de senha vencidos. Retorna o total. */
export async function cleanupExpiredRefreshTokens(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - EXPIRED_TOKEN_RETENTION_MS)
  const [refresh, resets] = await db.$transaction([
    db.refreshToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    // Links de senha vencidos não servem para nada (nem auditoria): saem depois de 1 dia
    db.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
  ])
  return refresh.count + resets.count
}

// Hash fixo usado para gastar o mesmo tempo quando o e-mail não existe (evita enumeração por timing).
let dummyHash: Promise<string> | undefined

type RegisterData = z.output<typeof registerSchema>

const mailUnavailable = () =>
  new AppError(
    503,
    'MAIL_UNAVAILABLE',
    'A recuperação de senha ainda não está disponível. Fale com o suporte do TinPet.',
  )

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

function resetEmail(to: string, name: string, link: string): MailMessage {
  const first = escapeHtml(name.split(' ')[0] ?? name)
  return {
    to,
    subject: 'Redefinir sua senha do TinPet',
    text: `Oi, ${name.split(' ')[0]}! Para criar uma senha nova, abra: ${link}\n\nO link vale ${PASSWORD_RESET_TTL_MINUTES} minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f1a17">
  <h1 style="color:#ef5b4c">TinPet 🐾</h1>
  <p>Oi, ${first}! Recebemos um pedido para redefinir a sua senha.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#ef5b4c;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Criar senha nova</a></p>
  <p style="color:#6b625c">O link vale ${PASSWORD_RESET_TTL_MINUTES} minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`,
  }
}

export function createAuthService(deps: AppDeps) {
  const { db, storage, tokens, mail, env } = deps
  const mfa = createMfaService(deps)
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
      // Só avisa da suspensão depois da senha certa (não revela o status a quem chuta e-mails)
      if (user.suspendedAt) throw accountSuspended()
      // Com 2FA ligado, a senha certa só libera a segunda etapa
      if (user.totpEnabledAt) {
        return { mfaRequired: true as const, mfaToken: await tokens.signMfa(user.id) }
      }
      return startSession(user.id)
    },

    /** Segunda etapa do login: código do app autenticador ou de recuperação. */
    async completeMfa(mfaToken: string, code: string) {
      const userId = await tokens.verifyMfa(mfaToken)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { suspendedAt: true },
      })
      if (!user) throw unauthorized('Sessão expirada')
      if (user.suspendedAt) throw accountSuspended()
      if (!(await mfa.checkFactor(userId, code))) throw invalidCode()
      return startSession(userId)
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
      const owner = await db.user.findUnique({
        where: { id: stored.userId },
        select: { suspendedAt: true },
      })
      if (owner?.suspendedAt) throw accountSuspended()
      return startSession(stored.userId, stored.familyId)
    },

    /**
     * Gera o link de redefinição e manda por e-mail. A resposta é a mesma exista ou não a conta
     * (não revela quem tem cadastro) e o envio não segura a requisição.
     */
    async forgotPassword(email: string, onSendError: (error: unknown) => void) {
      if (!mail) throw mailUnavailable()
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, name: true, suspendedAt: true },
      })
      if (!user || user.suspendedAt) return
      const reset = newOpaqueToken()
      await db.$transaction([
        // Só o link mais recente vale
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: reset.hash,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
          },
        }),
      ])
      const link = `${env.APP_URL.replace(/\/$/, '')}/redefinir-senha/${reset.token}`
      void mail.send(resetEmail(email, user.name, link)).catch(onSendError)
    },

    /** Troca a senha pelo link do e-mail e derruba todas as sessões abertas. */
    async resetPassword(token: string, password: string) {
      const stored = await db.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
      })
      if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
        throw badRequest('INVALID_RESET_TOKEN', 'Link inválido ou expirado. Peça um novo.')
      }
      const now = new Date()
      // Atualização condicional: o mesmo link não serve duas vezes nem em requisições simultâneas
      const claimed = await db.passwordResetToken.updateMany({
        where: { id: stored.id, usedAt: null },
        data: { usedAt: now },
      })
      if (claimed.count === 0) {
        throw badRequest('INVALID_RESET_TOKEN', 'Link inválido ou expirado. Peça um novo.')
      }
      await db.$transaction([
        db.user.update({
          where: { id: stored.userId },
          data: { passwordHash: await argon2.hash(password) },
        }),
        db.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: now },
        }),
      ])
    },

    /** Revoga todas as sessões do usuário (outros celulares e navegadores precisam entrar de novo). */
    async logoutAll(userId: string) {
      await db.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
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
