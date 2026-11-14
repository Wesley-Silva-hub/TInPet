import type { ModerationReport, Page } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import type { App } from '../../app'
import { auth, db, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

let adminSequence = 0

/** Promove uma conta a ADMIN e entra de novo para o token carregar o papel. */
async function registerAdmin(app: App) {
  const { user } = await registerOwner(app, { name: 'Moderadora' })
  await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } })
  adminSequence++
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: `10.200.0.${adminSequence}`,
    payload: { email: user.email, password: 'senha-segura-123' },
  })
  return { token: login.json().accessToken as string, user }
}

async function report(app: App, token: string, targetId: string) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/users/${targetId}/report`,
    headers: auth(token),
    payload: { reason: 'FAKE_PROFILE', details: 'Fotos de outra pessoa' },
  })
  expect(response.statusCode).toBe(204)
}

const listReports = (token: string, status = 'open') =>
  ctx.app.inject({
    method: 'GET',
    url: `/api/v1/admin/reports?status=${status}`,
    headers: auth(token),
  })

describe('moderação', () => {
  it('só ADMIN acessa o painel', async () => {
    const owner = await registerOwner(ctx.app)
    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    for (const token of [owner.token, company.token]) {
      expect((await listReports(token)).statusCode).toBe(403)
    }
    const someone = await registerOwner(ctx.app)
    const suspend = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${someone.user.id}/suspend`,
      headers: auth(owner.token),
    })
    expect(suspend.statusCode).toBe(403)
    expect((await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/reports' })).statusCode).toBe(
      401,
    )
  })

  it('lista denúncias abertas sem expor e-mail e permite resolver', async () => {
    const admin = await registerAdmin(ctx.app)
    const reporter = await registerOwner(ctx.app)
    const other = await registerOwner(ctx.app)
    const target = await registerOwner(ctx.app, { name: 'Perfil Suspeito' })
    await report(ctx.app, reporter.token, target.user.id)
    await report(ctx.app, other.token, target.user.id)

    const open = await listReports(admin.token)
    expect(open.statusCode).toBe(200)
    const page = open.json<Page<ModerationReport>>()
    expect(page.items).toHaveLength(2)
    expect(page.items[0]?.reported).toMatchObject({
      name: 'Perfil Suspeito',
      suspended: false,
      openReports: 2,
    })
    expect(open.body).not.toContain(target.user.email)
    expect(open.body).not.toContain(reporter.user.email)

    const first = page.items[0] as ModerationReport
    const resolved = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/reports/${first.id}/resolve`,
      headers: auth(admin.token),
    })
    expect(resolved.statusCode).toBe(204)
    expect((await listReports(admin.token)).json<Page<ModerationReport>>().items).toHaveLength(1)
    const done = (await listReports(admin.token, 'resolved')).json<Page<ModerationReport>>()
    expect(done.items.map((item) => item.id)).toEqual([first.id])
    expect(done.items[0]?.resolvedAt).not.toBeNull()
  })

  it('suspender derruba as sessões, impede novo login e encerra as denúncias', async () => {
    const admin = await registerAdmin(ctx.app)
    const reporter = await registerOwner(ctx.app)
    const target = await registerOwner(ctx.app)
    await report(ctx.app, reporter.token, target.user.id)

    const suspend = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${target.user.id}/suspend`,
      headers: auth(admin.token),
    })
    expect(suspend.statusCode).toBe(204)

    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { tinpet_rt: target.refreshCookie },
    })
    expect(refresh.statusCode).toBe(401)
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: '10.201.0.1',
      payload: { email: target.user.email, password: 'senha-segura-123' },
    })
    expect(login.statusCode).toBe(403)
    expect(login.json().error.code).toBe('ACCOUNT_SUSPENDED')
    expect((await listReports(admin.token)).json<Page<ModerationReport>>().items).toHaveLength(0)

    const reactivate = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${target.user.id}/suspend`,
      headers: auth(admin.token),
    })
    expect(reactivate.statusCode).toBe(204)
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: '10.201.0.2',
      payload: { email: target.user.email, password: 'senha-segura-123' },
    })
    expect(again.statusCode).toBe(200)
  })

  it('não suspende a si mesmo nem outro moderador', async () => {
    const admin = await registerAdmin(ctx.app)
    const otherAdmin = await registerAdmin(ctx.app)
    for (const id of [admin.user.id, otherAdmin.user.id]) {
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/admin/users/${id}/suspend`,
        headers: auth(admin.token),
      })
      expect(response.statusCode).toBe(400)
    }
  })
})
