import { describe, expect, it } from 'vitest'
import { auth, db, registerOwner, setupTestApp } from '../../test/helpers'
import { cleanupExpiredRefreshTokens } from './service'

const ctx = setupTestApp()

const refresh = (cookie: string) =>
  ctx.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies: { tinpet_rt: cookie } })

describe('auth', () => {
  it('cadastra com consentimentos, guarda senha com hash e devolve sessão', async () => {
    const { token, user, refreshCookie } = await registerOwner(ctx.app)
    expect(token).toBeTruthy()
    expect(refreshCookie).toBeTruthy()
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/)
    expect(stored.consentTermsAt).toBeInstanceOf(Date)
    expect(stored.consentLocationAt).toBeInstanceOf(Date)
    const tokens = await db.refreshToken.findMany({ where: { userId: user.id } })
    expect(tokens[0]?.tokenHash).not.toBe(refreshCookie)
  })

  it('recusa cadastro sem aceitar termos ou menor de idade', async () => {
    const base = {
      name: 'Teste',
      email: 'novo@teste.dev',
      password: 'senha-segura-123',
      role: 'OWNER',
      acceptLocation: false,
    }
    const noTerms = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...base, birthDate: '1990-01-01', acceptTerms: false },
    })
    expect(noTerms.statusCode).toBe(400)
    const minor = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...base, birthDate: new Date().toISOString().slice(0, 10), acceptTerms: true },
    })
    expect(minor.statusCode).toBe(400)
    expect(minor.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('login com senha errada devolve 401 genérico', async () => {
    const { user } = await registerOwner(ctx.app)
    const wrong = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: user.email, password: 'errada-123' },
    })
    expect(wrong.statusCode).toBe(401)
    const unknown = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'ninguem@teste.dev', password: 'errada-123' },
    })
    expect(unknown.json().error).toEqual(wrong.json().error)
  })

  it('rotaciona o refresh token e revoga a família quando um token antigo é reutilizado', async () => {
    const { refreshCookie } = await registerOwner(ctx.app)
    const first = await refresh(refreshCookie)
    expect(first.statusCode).toBe(200)
    const rotated = first.cookies.find((c) => c.name === 'tinpet_rt')?.value as string
    expect(rotated).not.toBe(refreshCookie)

    // Reuso do token antigo depois da janela de tolerância = possível roubo
    await db.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    })
    expect((await refresh(refreshCookie)).statusCode).toBe(401)
    // ...e o token novo da mesma família também deixa de valer
    expect((await refresh(rotated)).statusCode).toBe(401)
  })

  it('logout revoga a sessão', async () => {
    const { refreshCookie } = await registerOwner(ctx.app)
    const logout = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { tinpet_rt: refreshCookie },
    })
    expect(logout.statusCode).toBe(204)
    expect((await refresh(refreshCookie)).statusCode).toBe(401)
  })

  it('sair de todos os dispositivos revoga todas as sessões do usuário', async () => {
    const { token, user, refreshCookie } = await registerOwner(ctx.app)
    const otherDevice = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: '10.98.0.1',
      payload: { email: user.email, password: 'senha-segura-123' },
    })
    const otherCookie = otherDevice.cookies.find((c) => c.name === 'tinpet_rt')?.value as string
    const someoneElse = await registerOwner(ctx.app)

    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout-all',
      headers: auth(token),
    })
    expect(response.statusCode).toBe(204)
    expect((await refresh(refreshCookie)).statusCode).toBe(401)
    expect((await refresh(otherCookie)).statusCode).toBe(401)
    // Não afeta outras contas
    expect((await refresh(someoneElse.refreshCookie)).statusCode).toBe(200)
  })

  it('sair de todos os dispositivos exige estar logado', async () => {
    const response = await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/logout-all' })
    expect(response.statusCode).toBe(401)
  })

  it('limpeza apaga só refresh tokens vencidos há mais de 30 dias', async () => {
    const { user } = await registerOwner(ctx.app)
    const day = 24 * 60 * 60 * 1000
    const base = { userId: user.id, familyId: crypto.randomUUID() }
    await db.refreshToken.createMany({
      data: [
        { ...base, tokenHash: 'antigo', expiresAt: new Date(Date.now() - 31 * day) },
        { ...base, tokenHash: 'recente', expiresAt: new Date(Date.now() - 5 * day) },
      ],
    })
    expect(await cleanupExpiredRefreshTokens(db)).toBe(1)
    const left = await db.refreshToken.findMany({ where: { userId: user.id } })
    expect(left.map((item) => item.tokenHash)).not.toContain('antigo')
    expect(left.map((item) => item.tokenHash)).toContain('recente')
    // A sessão válida do cadastro continua lá
    expect(left).toHaveLength(2)
  })

  it('limita tentativas de login por IP', async () => {
    const attempt = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: '10.99.99.99',
        payload: { email: 'alvo@teste.dev', password: 'chute-123' },
      })
    for (let i = 0; i < 10; i++) expect((await attempt()).statusCode).toBe(401)
    const blocked = await attempt()
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error.code).toBe('RATE_LIMITED')
  })

  it('rotas protegidas exigem token válido', async () => {
    const none = await ctx.app.inject({ method: 'GET', url: '/api/v1/me' })
    expect(none.statusCode).toBe(401)
    const invalid = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: auth('x.y.z'),
    })
    expect(invalid.statusCode).toBe(401)
  })
})
