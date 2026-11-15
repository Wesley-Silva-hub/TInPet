import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../app'
import { loadEnv } from '../../shared/env'
import { db, mail, registerOwner, setupTestApp, storage } from '../../test/helpers'

const ctx = setupTestApp()

let ip = 0
const forgot = (email: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/forgot-password',
    remoteAddress: `10.77.0.${++ip}`,
    payload: { email },
  })

const reset = (token: string, password: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/reset-password',
    remoteAddress: `10.78.0.${++ip}`,
    payload: { token, password },
  })

const login = (email: string, password: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: `10.79.0.${++ip}`,
    payload: { email, password },
  })

/** O envio é em segundo plano: espera o e-mail chegar e tira o token do link. */
async function tokenFromEmail(to: string) {
  await vi.waitFor(() => expect(mail.outbox.some((item) => item.to === to)).toBe(true))
  const message = mail.outbox.findLast((item) => item.to === to)
  const token = message?.text.match(/redefinir-senha\/([\w-]+)/)?.[1]
  if (!token) throw new Error('link não encontrado no e-mail')
  return token
}

describe('esqueci minha senha', () => {
  it('envia o link, troca a senha e derruba as sessões abertas', async () => {
    const { user, refreshCookie } = await registerOwner(ctx.app)
    expect((await forgot(user.email)).statusCode).toBe(204)
    const token = await tokenFromEmail(user.email)
    expect(mail.outbox.at(-1)?.text).toContain('http://localhost:5173/redefinir-senha/')
    // O banco guarda só o hash
    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } })
    expect(stored.tokenHash).not.toBe(token)

    expect((await reset(token, 'nova-senha-forte-1')).statusCode).toBe(204)
    expect((await login(user.email, 'senha-segura-123')).statusCode).toBe(401)
    expect((await login(user.email, 'nova-senha-forte-1')).statusCode).toBe(200)
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { tinpet_rt: refreshCookie },
    })
    expect(refresh.statusCode).toBe(401)
  })

  it('o link é de uso único, expira e só o mais recente vale', async () => {
    const { user } = await registerOwner(ctx.app)
    await forgot(user.email)
    const first = await tokenFromEmail(user.email)
    mail.outbox.length = 0
    await forgot(user.email)
    const second = await tokenFromEmail(user.email)

    expect((await reset(first, 'outra-senha-123')).json().error.code).toBe('INVALID_RESET_TOKEN')
    expect((await reset(second, 'outra-senha-123')).statusCode).toBe(204)
    expect((await reset(second, 'mais-uma-senha-1')).statusCode).toBe(400)

    mail.outbox.length = 0
    await forgot(user.email)
    const late = await tokenFromEmail(user.email)
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    expect((await reset(late, 'tarde-demais-1')).statusCode).toBe(400)
  })

  it('responde igual para e-mail sem conta e não envia nada', async () => {
    const response = await forgot('ninguem@teste.dev')
    expect(response.statusCode).toBe(204)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mail.outbox).toHaveLength(0)
  })

  it('valida a senha nova e limita pedidos por IP', async () => {
    const { user } = await registerOwner(ctx.app)
    await forgot(user.email)
    const token = await tokenFromEmail(user.email)
    expect((await reset(token, 'curta')).statusCode).toBe(400)

    const attempt = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        remoteAddress: '10.88.88.88',
        payload: { email: user.email },
      })
    for (let i = 0; i < 5; i++) expect((await attempt()).statusCode).toBe(204)
    expect((await attempt()).statusCode).toBe(429)
  })

  it('sem e-mail configurado (produção sem Resend) avisa que não está disponível', async () => {
    const app = await buildApp({ env: loadEnv(), db, storage, mail: null })
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'alguem@teste.dev' },
      })
      expect(response.statusCode).toBe(503)
      expect(response.json().error.code).toBe('MAIL_UNAVAILABLE')
    } finally {
      await app.close()
    }
  })
})
