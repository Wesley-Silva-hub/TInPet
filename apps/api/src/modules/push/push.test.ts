import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../app'
import { loadEnv } from '../../shared/env'
import { auth, createPet, db, push, registerOwner, setupTestApp, storage } from '../../test/helpers'

const ctx = setupTestApp()

const subscription = (n: number) => ({
  endpoint: `https://push.exemplo.dev/aparelho-${n}`,
  keys: { p256dh: `chave-publica-${n}-xxxxxxxx`, auth: `segredo-${n}-xxxx` },
})

const subscribe = (token: string, n: number) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/push/subscriptions',
    headers: auth(token),
    payload: subscription(n),
  })

describe('notificações push', () => {
  it('entrega o aviso com o mesmo texto do app no aparelho inscrito', async () => {
    const ana = await registerOwner(ctx.app, { name: 'Ana Souza' })
    const bia = await registerOwner(ctx.app, { name: 'Bia Lima' })
    expect((await subscribe(ana.token, 1)).statusCode).toBe(204)
    const post = await db.post.create({
      data: { authorId: ana.user.id, imageKey: 'posts/x.webp', caption: '' },
    })
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bia.token),
    })
    await vi.waitFor(() => expect(push.sent).toHaveLength(1))
    expect(push.sent[0]).toMatchObject({
      endpoint: subscription(1).endpoint,
      payload: { title: 'TinPet', body: 'Bia curtiu sua publicação.', url: `/posts/${post.id}` },
    })
  })

  it('apaga a inscrição de aparelho que não existe mais', async () => {
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)
    await subscribe(ana.token, 2)
    push.gone.add(subscription(2).endpoint)
    const post = await db.post.create({
      data: { authorId: ana.user.id, imageKey: 'posts/x.webp', caption: '' },
    })
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bia.token),
    })
    await vi.waitFor(async () => expect(await db.pushSubscription.count()).toBe(0))
  })

  it('mensagem no chat vira push para a outra pessoa, agrupada por conversa', async () => {
    const ana = await registerOwner(ctx.app, { name: 'Ana Souza' })
    const bia = await registerOwner(ctx.app)
    const [petA, petB] = await Promise.all([
      createPet(ctx.app, ana.token),
      createPet(ctx.app, bia.token),
    ])
    const [first, second] = [petA.id, petB.id].sort() as [string, string]
    const match = await db.match.create({ data: { petAId: first, petBId: second } })
    await subscribe(bia.token, 3)
    await subscribe(ana.token, 4)

    const sent = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/matches/${match.id}/messages`,
      headers: auth(ana.token),
      payload: { content: 'Oi! Bora passear sábado?' },
    })
    expect(sent.statusCode).toBe(201)
    await vi.waitFor(() => expect(push.sent).toHaveLength(1))
    expect(push.sent[0]).toMatchObject({
      endpoint: subscription(3).endpoint,
      payload: {
        title: 'Mensagem de Ana',
        body: 'Oi! Bora passear sábado?',
        tag: `chat:${match.id}`,
      },
    })
  })

  it('o mesmo aparelho passa para a conta logada nele; descadastrar remove', async () => {
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)
    await subscribe(ana.token, 5)
    await subscribe(bia.token, 5)
    const rows = await db.pushSubscription.findMany()
    expect(rows.map((row) => row.userId)).toEqual([bia.user.id])

    await ctx.app.inject({
      method: 'DELETE',
      url: '/api/v1/push/subscriptions',
      headers: auth(bia.token),
      payload: { endpoint: subscription(5).endpoint },
    })
    expect(await db.pushSubscription.count()).toBe(0)
  })

  it('recusa endpoint que não é https e informa a configuração', async () => {
    const ana = await registerOwner(ctx.app)
    const bad = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/push/subscriptions',
      headers: auth(ana.token),
      payload: { ...subscription(6), endpoint: 'http://inseguro.dev/x' },
    })
    expect(bad.statusCode).toBe(400)
    const config = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/push/config',
      headers: auth(ana.token),
    })
    expect(config.json()).toEqual({ enabled: true, publicKey: 'chave-publica-de-teste' })

    const off = await buildApp({ env: loadEnv(), db, storage, push: null })
    try {
      const response = await off.inject({
        method: 'GET',
        url: '/api/v1/push/config',
        headers: auth(ana.token),
      })
      expect(response.json()).toEqual({ enabled: false, publicKey: null })
    } finally {
      await off.close()
    }
  })
})
