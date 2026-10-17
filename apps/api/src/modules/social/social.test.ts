import type { Comment, LikeResult, Page, Post } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setupTestApp, storage } from '../../test/helpers'

const ctx = setupTestApp()

async function postMultipart(token: string, fields: Record<string, string> = {}) {
  const { default: sharp } = await import('sharp')
  const image = await sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer()
  const boundary = '----tinpet-post'
  const parts = Object.entries(fields).map(
    ([name, value]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
  )
  const payload = Buffer.concat([
    Buffer.from(parts.join('')),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    image,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/posts',
    headers: { ...auth(token), 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload,
  })
}

async function createPost(token: string, fields: Record<string, string> = {}) {
  const response = await postMultipart(token, fields)
  if (response.statusCode !== 201) throw new Error(`createPost falhou: ${response.body}`)
  return response.json<Post>()
}

const feed = async (token: string, query = '') =>
  (
    await ctx.app.inject({ method: 'GET', url: `/api/v1/posts${query}`, headers: auth(token) })
  ).json<Page<Post>>()

describe('feed social', () => {
  it('publica foto com legenda e pet, e aparece no feed de todos', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token, { name: 'Thor' })
    const post = await createPost(ana.token, { caption: 'Dia de parque!', petId: thor.id })
    expect(post).toMatchObject({ caption: 'Dia de parque!', mine: true, likeCount: 0 })
    expect(post.pet?.name).toBe('Thor')

    const page = await feed(bruno.token)
    expect(page.items.map((item) => item.id)).toEqual([post.id])
    expect(page.items[0]?.mine).toBe(false)
    expect(JSON.stringify(page)).not.toMatch(/email|latitude|birthDate/)
  })

  it('não deixa marcar pet de outra pessoa', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const luna = await createPet(ctx.app, bruno.token)
    const response = await postMultipart(ana.token, { petId: luna.id })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_PET')
  })

  it('curtir é idempotente e descurtir volta a contagem', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const post = await createPost(ana.token)
    const like = () =>
      ctx.app.inject({
        method: 'PUT',
        url: `/api/v1/posts/${post.id}/like`,
        headers: auth(bruno.token),
      })
    await like()
    const twice = (await like()).json<LikeResult>()
    expect(twice).toEqual({ likeCount: 1, likedByMe: true })
    const unlike = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bruno.token),
    })
    expect(unlike.json<LikeResult>()).toEqual({ likeCount: 0, likedByMe: false })
  })

  it('comentários: ordem cronológica, prévia no card e quem pode apagar', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const carla = await registerOwner(ctx.app)
    const post = await createPost(ana.token)
    const comment = async (token: string, content: string) =>
      (
        await ctx.app.inject({
          method: 'POST',
          url: `/api/v1/posts/${post.id}/comments`,
          headers: auth(token),
          payload: { content },
        })
      ).json<Comment>()
    const first = await comment(bruno.token, 'Que fofo!')
    await comment(carla.token, 'Lindo demais')
    await comment(bruno.token, 'Bora marcar um passeio')

    const list = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: auth(ana.token),
    })
    expect(list.json<Page<Comment>>().items.map((c) => c.content)).toEqual([
      'Que fofo!',
      'Lindo demais',
      'Bora marcar um passeio',
    ])
    const card = (await feed(ana.token)).items[0]
    expect(card?.commentCount).toBe(3)
    expect(card?.recentComments.map((c) => c.content)).toEqual([
      'Lindo demais',
      'Bora marcar um passeio',
    ])

    const byStranger = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/comments/${first.id}`,
      headers: auth(carla.token),
    })
    expect(byStranger.statusCode).toBe(403)
    const byPostAuthor = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/comments/${first.id}`,
      headers: auth(ana.token),
    })
    expect(byPostAuthor.statusCode).toBe(204)
  })

  it('bloqueio esconde posts e impede interação', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const post = await createPost(ana.token)
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${bruno.user.id}/block`,
      headers: auth(ana.token),
    })
    expect((await feed(bruno.token)).items).toHaveLength(0)
    const like = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${post.id}/like`,
      headers: auth(bruno.token),
    })
    expect(like.statusCode).toBe(404)
  })

  it('pagina por cursor e filtra por autor', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    for (const caption of ['1', '2', '3']) await createPost(ana.token, { caption })
    await createPost(bruno.token, { caption: 'do Bruno' })

    const first = await feed(ana.token, '?limit=2')
    const second = await feed(ana.token, `?limit=2&cursor=${first.nextCursor}`)
    const all = [...first.items, ...second.items].map((p) => p.caption)
    expect(all).toEqual(['do Bruno', '3', '2', '1'])
    const onlyAna = await feed(bruno.token, `?authorId=${ana.user.id}`)
    expect(onlyAna.items.map((p) => p.caption)).toEqual(['3', '2', '1'])
  })

  it('só o autor apaga o post, e a imagem sai do storage', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const post = await createPost(ana.token)
    const key = post.imageUrl.replace('/api/v1/files/', '')
    const denied = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${post.id}`,
      headers: auth(bruno.token),
    })
    expect(denied.statusCode).toBe(403)
    await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${post.id}`,
      headers: auth(ana.token),
    })
    expect(await db.post.count()).toBe(0)
    const { existsSync } = await import('node:fs')
    expect(existsSync(storage.resolveKey(key) as string)).toBe(false)
  })
})

describe('notícias', () => {
  it('lista só artigos publicados, filtra por categoria e abre pelo slug', async () => {
    const now = Date.now()
    await db.article.createMany({
      data: [
        {
          slug: 'vacinas',
          title: 'Vacinas',
          summary: 's',
          body: 'b',
          category: 'HEALTH',
          publishedAt: new Date(now - 1000),
        },
        {
          slug: 'adote',
          title: 'Adote',
          summary: 's',
          body: 'b',
          category: 'ADOPTION',
          publishedAt: new Date(now - 2000),
        },
        {
          slug: 'futuro',
          title: 'Futuro',
          summary: 's',
          body: 'b',
          category: 'HEALTH',
          publishedAt: new Date(now + 86_400_000),
        },
      ],
    })
    const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/articles' })
    expect(list.json().items.map((a: { slug: string }) => a.slug)).toEqual(['vacinas', 'adote'])
    const health = await ctx.app.inject({ method: 'GET', url: '/api/v1/articles?category=HEALTH' })
    expect(health.json().items).toHaveLength(1)
    const one = await ctx.app.inject({ method: 'GET', url: '/api/v1/articles/vacinas' })
    expect(one.json()).toMatchObject({ title: 'Vacinas', body: 'b' })
    const scheduled = await ctx.app.inject({ method: 'GET', url: '/api/v1/articles/futuro' })
    expect(scheduled.statusCode).toBe(404)
  })
})
