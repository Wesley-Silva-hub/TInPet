import type { Notification, Page } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

async function createPost(authorId: string) {
  return db.post.create({ data: { authorId, imageKey: 'posts/teste.webp', caption: 'oi' } })
}

const list = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(token) })
  ).json<Page<Notification>>()

const unread = async (token: string) =>
  (
    await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
      headers: auth(token),
    })
  ).json<{ unread: number }>().unread

describe('notificações', () => {
  it('avisa curtida e comentário ao autor, sem duplicar nem avisar a própria ação', async () => {
    const ana = await registerOwner(ctx.app, { name: 'Ana' })
    const bruno = await registerOwner(ctx.app, { name: 'Bruno' })
    const post = await createPost(ana.user.id)
    const like = (token: string, method: 'PUT' | 'DELETE' = 'PUT') =>
      ctx.app.inject({ method, url: `/api/v1/posts/${post.id}/like`, headers: auth(token) })

    await like(bruno.token)
    await like(bruno.token, 'DELETE')
    await like(bruno.token)
    await like(ana.token) // a própria curtida não gera aviso
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: auth(bruno.token),
      payload: { content: 'Que foto linda!' },
    })

    const items = (await list(ana.token)).items
    expect(items.map((n) => [n.type, n.actor?.name])).toEqual([
      ['POST_COMMENT', 'Bruno'],
      ['POST_LIKE', 'Bruno'],
    ])
    expect(items[0]?.preview).toBe('Que foto linda!')
    expect(await unread(bruno.token)).toBe(0)
  })

  it('descurtir remove o aviso de curtida', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const post = await createPost(ana.user.id)
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bruno.token),
    })
    await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bruno.token),
    })
    expect(await unread(ana.token)).toBe(0)
  })

  it('match avisa os dois tutores e "marcar todas como lidas" zera o contador', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    const luna = await createPet(ctx.app, bruno.token)
    const like = (token: string, from: string, to: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/v1/swipes',
        headers: auth(token),
        payload: { fromPetId: from, toPetId: to, direction: 'LIKE' },
      })
    await like(ana.token, thor.id, luna.id)
    await like(bruno.token, luna.id, thor.id)

    expect((await list(ana.token)).items[0]?.type).toBe('MATCH')
    expect((await list(bruno.token)).items[0]?.actor?.id).toBe(ana.user.id)
    expect(await unread(ana.token)).toBe(1)

    await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: auth(ana.token),
    })
    expect(await unread(ana.token)).toBe(0)
    expect(await unread(bruno.token)).toBe(1)
  })

  it('cada um só vê as próprias notificações', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const carla = await registerOwner(ctx.app)
    const post = await createPost(ana.user.id)
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bruno.token),
    })
    expect((await list(carla.token)).items).toEqual([])
  })
})

describe('em alta', () => {
  it('ordena pelos mais curtidos da semana e ignora posts antigos', async () => {
    const ana = await registerOwner(ctx.app)
    const fans = await Promise.all([1, 2, 3].map(() => registerOwner(ctx.app)))
    const popular = await createPost(ana.user.id)
    const normal = await createPost(ana.user.id)
    const old = await db.post.create({
      data: {
        authorId: ana.user.id,
        imageKey: 'posts/velho.webp',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    })
    await db.postLike.createMany({
      data: [
        ...fans.map((fan) => ({ postId: popular.id, userId: fan.user.id })),
        { postId: normal.id, userId: fans[0]?.user.id as string },
        ...fans.map((fan) => ({ postId: old.id, userId: fan.user.id })),
      ],
    })
    const trending = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/posts/trending',
      headers: auth(ana.token),
    })
    expect(trending.json<{ id: string }[]>().map((p) => p.id)).toEqual([popular.id, normal.id])
  })
})
