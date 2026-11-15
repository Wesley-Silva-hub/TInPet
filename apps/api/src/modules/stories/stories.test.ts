import { existsSync } from 'node:fs'
import type { StoryGroup } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import {
  auth,
  createPet,
  db,
  imageMultipart,
  registerOwner,
  setupTestApp,
  storage,
} from '../../test/helpers'
import { cleanupExpiredStories } from './service'

const ctx = setupTestApp()

async function postStory(token: string, fields: Record<string, string> = {}) {
  const upload = await imageMultipart()
  const boundary = upload.headers['content-type'].split('boundary=')[1] as string
  const fieldParts = Object.entries(fields).map(
    ([name, value]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
  )
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/stories',
    headers: { ...auth(token), ...upload.headers },
    payload: Buffer.concat([Buffer.from(fieldParts.join('')), upload.payload]),
  })
}

const storiesOf = async (token: string) =>
  (await ctx.app.inject({ method: 'GET', url: '/api/v1/stories', headers: auth(token) })).json<
    StoryGroup[]
  >()

describe('stories', () => {
  it('publica, agrupa por pessoa e marca como visto', async () => {
    const ana = await registerOwner(ctx.app, { name: 'Ana' })
    const bia = await registerOwner(ctx.app, { name: 'Bia' })
    const pet = await createPet(ctx.app, ana.token, { name: 'Thor' })
    const created = await postStory(ana.token, { caption: 'Bom dia!', petId: pet.id })
    expect(created.statusCode).toBe(201)
    await postStory(ana.token)

    const groups = await storiesOf(bia.token)
    expect(groups).toHaveLength(1)
    const [group] = groups as [StoryGroup]
    expect(group).toMatchObject({ isMine: false, allSeen: false })
    expect(group.items).toHaveLength(2)
    expect(group.items[0]).toMatchObject({
      caption: 'Bom dia!',
      pet: { name: 'Thor' },
      seen: false,
    })
    expect(group.items[0]?.viewCount).toBeNull()

    for (const story of group.items) {
      const view = await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/stories/${story.id}/view`,
        headers: auth(bia.token),
      })
      expect(view.statusCode).toBe(204)
    }
    expect((await storiesOf(bia.token))[0]?.allSeen).toBe(true)

    const mine = (await storiesOf(ana.token))[0]
    expect(mine?.isMine).toBe(true)
    expect(mine?.items.map((item) => item.viewCount)).toEqual([1, 1])
  })

  it('só o autor apaga; o arquivo sai do storage', async () => {
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)
    const { id } = (await postStory(ana.token)).json<{ id: string }>()
    const stored = await db.story.findUniqueOrThrow({ where: { id } })
    expect(existsSync(storage.resolveKey(stored.imageKey) as string)).toBe(true)

    const denied = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/stories/${id}`,
      headers: auth(bia.token),
    })
    expect(denied.statusCode).toBe(403)
    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/stories/${id}`,
      headers: auth(ana.token),
    })
    expect(removed.statusCode).toBe(204)
    expect(existsSync(storage.resolveKey(stored.imageKey) as string)).toBe(false)
  })

  it('stories vencidos somem da lista e a limpeza apaga registro e foto', async () => {
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)
    const { id } = (await postStory(ana.token)).json<{ id: string }>()
    const stored = await db.story.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    expect(await storiesOf(bia.token)).toHaveLength(0)

    expect(await cleanupExpiredStories(ctx.app.deps)).toBe(1)
    expect(await db.story.count()).toBe(0)
    expect(existsSync(storage.resolveKey(stored.imageKey) as string)).toBe(false)
  })

  it('bloqueio esconde stories; empresa não publica; pet precisa ser seu', async () => {
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)
    await postStory(ana.token)
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${ana.user.id}/block`,
      headers: auth(bia.token),
    })
    expect(await storiesOf(bia.token)).toHaveLength(0)

    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    expect((await postStory(company.token)).statusCode).toBe(403)

    const otherPet = await createPet(ctx.app, bia.token)
    const wrongPet = await postStory(ana.token, { petId: otherPet.id })
    expect(wrongPet.statusCode).toBe(400)
  })
})
