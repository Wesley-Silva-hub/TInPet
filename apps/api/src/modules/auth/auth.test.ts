import { describe, expect, it } from 'vitest'
import { auth, db, registerOwner, setupTestApp } from '../../test/helpers'

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
