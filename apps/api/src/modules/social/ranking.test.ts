import type { Ranking } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import type { App } from '../../app'
import { auth, createPet, db, registerOwner, setLocation, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const TERESINA = [-5.07, -42.79] as const
const PERTO = [-5.09, -42.8] as const
const LONGE = [-23.56, -46.65] as const

async function tutorWithPet(app: App, place: readonly [number, number], name: string) {
  const person = await registerOwner(app)
  await setLocation(app, person.token, place[0], place[1])
  const pet = await createPet(app, person.token, { name })
  return { ...person, pet }
}

async function post(authorId: string, petId: string) {
  return db.post.create({ data: { authorId, petId, imageKey: 'posts/teste.webp', caption: '' } })
}

async function likeTimes(postId: string, tokens: string[]) {
  for (const token of tokens) {
    await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${postId}/like`,
      headers: auth(token),
    })
  }
}

const rankingOf = async (token: string, query = '') =>
  (
    await ctx.app.inject({ method: 'GET', url: `/api/v1/ranking${query}`, headers: auth(token) })
  ).json<Ranking>()

describe('ranking da região', () => {
  it('ordena pets por curtidas recebidas e ignora quem está longe', async () => {
    const viewer = await tutorWithPet(ctx.app, TERESINA, 'Meu')
    const thor = await tutorWithPet(ctx.app, PERTO, 'Thor')
    const mel = await tutorWithPet(ctx.app, PERTO, 'Mel')
    const longe = await tutorWithPet(ctx.app, LONGE, 'Paulista')
    const fans = await Promise.all([1, 2, 3].map(() => registerOwner(ctx.app)))
    const tokens = fans.map((fan) => fan.token)

    await likeTimes((await post(thor.user.id, thor.pet.id)).id, tokens)
    await likeTimes((await post(mel.user.id, mel.pet.id)).id, tokens.slice(0, 1))
    await likeTimes((await post(longe.user.id, longe.pet.id)).id, [...tokens, viewer.token])

    const ranking = await rankingOf(viewer.token)
    expect(ranking.scope).toBe('region')
    expect(ranking.items.map((item) => [item.position, item.pet.name, item.likes])).toEqual([
      [1, 'Thor', 3],
      [2, 'Mel', 1],
    ])
    expect(ranking.items[0]?.distanceKm).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(ranking)).not.toMatch(/latitude|longitude/)
  })

  it('sem localização mostra o ranking geral; filtra espécie e respeita bloqueio', async () => {
    const semLocal = await registerOwner(ctx.app)
    const gato = await tutorWithPet(ctx.app, LONGE, 'Félix')
    await db.pet.update({ where: { id: gato.pet.id }, data: { species: 'CAT' } })
    const cao = await tutorWithPet(ctx.app, PERTO, 'Rex')
    await likeTimes((await post(gato.user.id, gato.pet.id)).id, [cao.token])
    await likeTimes((await post(cao.user.id, cao.pet.id)).id, [gato.token])

    const geral = await rankingOf(semLocal.token)
    expect(geral.scope).toBe('everywhere')
    expect(geral.items).toHaveLength(2)
    const gatos = await rankingOf(semLocal.token, '?species=CAT')
    expect(gatos.items.map((item) => item.pet.name)).toEqual(['Félix'])

    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${gato.user.id}/block`,
      headers: auth(semLocal.token),
    })
    expect((await rankingOf(semLocal.token)).items.map((item) => item.pet.name)).toEqual(['Rex'])
  })
})
