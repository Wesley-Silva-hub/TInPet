import type { FeedItem, MatchSummary, Page, SwipeResult } from '@tinpet/shared'
import { arePurposesCompatible } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setLocation, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

async function feed(token: string, petId: string, extra = '') {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/feed?petId=${petId}${extra}`,
    headers: auth(token),
  })
  expect(response.statusCode).toBe(200)
  return response.json<Page<FeedItem>>()
}

function swipe(token: string, fromPetId: string, toPetId: string, direction = 'LIKE') {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/swipes',
    headers: auth(token),
    payload: { fromPetId, toPetId, direction },
  })
}

describe('regra de compatibilidade', () => {
  it('amizade combina com qualquer sexo; cruzamento exige sexo oposto', () => {
    expect(
      arePurposesCompatible(
        { purpose: 'FRIENDSHIP', sex: 'MALE' },
        { purpose: 'BOTH', sex: 'MALE' },
      ),
    ).toBe(true)
    expect(
      arePurposesCompatible({ purpose: 'MATING', sex: 'MALE' }, { purpose: 'MATING', sex: 'MALE' }),
    ).toBe(false)
    expect(
      arePurposesCompatible({ purpose: 'MATING', sex: 'MALE' }, { purpose: 'BOTH', sex: 'FEMALE' }),
    ).toBe(true)
    expect(
      arePurposesCompatible(
        { purpose: 'MATING', sex: 'MALE' },
        { purpose: 'FRIENDSHIP', sex: 'FEMALE' },
      ),
    ).toBe(false)
  })
})

describe('feed', () => {
  it('mostra só pets compatíveis de outros donos, por distância, sem expor coordenadas', async () => {
    const me = await registerOwner(ctx.app)
    const near = await registerOwner(ctx.app)
    const far = await registerOwner(ctx.app)
    const tooFar = await registerOwner(ctx.app)
    await setLocation(ctx.app, me.token, -23.5614, -46.6559)
    await setLocation(ctx.app, near.token, -23.5869, -46.6823) // ~4 km
    await setLocation(ctx.app, far.token, -23.6639, -46.5383) // ~16 km
    await setLocation(ctx.app, tooFar.token, -22.9099, -47.0626) // Campinas, ~80 km

    const myPet = await createPet(ctx.app, me.token, { name: 'Meu' })
    await createPet(ctx.app, me.token, { name: 'Outro meu' })
    const nearPet = await createPet(ctx.app, near.token, { name: 'Perto' })
    const farPet = await createPet(ctx.app, far.token, { name: 'Longe' })
    await createPet(ctx.app, tooFar.token, { name: 'Muito longe' })
    await createPet(ctx.app, near.token, { name: 'Gato', species: 'CAT' })
    await createPet(ctx.app, far.token, { name: 'Só cruzamento', purpose: 'MATING' })

    const page = await feed(me.token, myPet.id)
    expect(page.items.map((item) => item.pet.name)).toEqual(['Perto', 'Longe'])
    expect(page.items[0]?.distanceKm).toBeGreaterThanOrEqual(3)
    expect(page.items[0]?.distanceKm).toBeLessThanOrEqual(5)
    expect(page.items[0]?.pet.id).toBe(nearPet.id)
    expect(page.items[1]?.pet.id).toBe(farPet.id)

    const raw = JSON.stringify(page)
    expect(raw).not.toMatch(/latitude|longitude|-23\.5|email|birthDate":"1990/)
  })

  it('pagina por cursor sem repetir nem pular pets', async () => {
    const me = await registerOwner(ctx.app)
    await setLocation(ctx.app, me.token, -23.56, -46.65)
    const myPet = await createPet(ctx.app, me.token)
    for (let i = 0; i < 5; i++) {
      const other = await registerOwner(ctx.app)
      await setLocation(ctx.app, other.token, -23.56 + i * 0.01, -46.65)
      await createPet(ctx.app, other.token, { name: `P${i}` })
    }
    const first = await feed(me.token, myPet.id, '&limit=2')
    const second = await feed(me.token, myPet.id, `&limit=2&cursor=${first.nextCursor}`)
    const third = await feed(me.token, myPet.id, `&limit=2&cursor=${second.nextCursor}`)
    const names = [...first.items, ...second.items, ...third.items].map((item) => item.pet.name)
    expect(names).toEqual(['P0', 'P1', 'P2', 'P3', 'P4'])
    expect(third.nextCursor).toBeNull()
  })

  it('some do feed quem já foi avaliado ou está bloqueado', async () => {
    const me = await registerOwner(ctx.app)
    const a = await registerOwner(ctx.app)
    const b = await registerOwner(ctx.app)
    const myPet = await createPet(ctx.app, me.token)
    const petA = await createPet(ctx.app, a.token, { name: 'A' })
    await createPet(ctx.app, b.token, { name: 'B' })

    expect((await swipe(me.token, myPet.id, petA.id, 'PASS')).statusCode).toBe(201)
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${b.user.id}/block`,
      headers: auth(me.token),
    })
    expect((await feed(me.token, myPet.id)).items).toHaveLength(0)
  })

  it('não permite usar o feed com pet de outra pessoa', async () => {
    const me = await registerOwner(ctx.app)
    const other = await registerOwner(ctx.app)
    const otherPet = await createPet(ctx.app, other.token)
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/feed?petId=${otherPet.id}`,
      headers: auth(me.token),
    })
    expect(response.statusCode).toBe(403)
  })
})

describe('filtros e afinidade', () => {
  it('filtra por porte e idade e explica a afinidade', async () => {
    const me = await registerOwner(ctx.app)
    const near = await registerOwner(ctx.app)
    await setLocation(ctx.app, me.token, -23.56, -46.65)
    await setLocation(ctx.app, near.token, -23.57, -46.65)
    const myPet = await createPet(ctx.app, me.token, { size: 'MEDIUM', birthDate: '2021-01-01' })
    await createPet(ctx.app, near.token, { name: 'Gêmeo', size: 'MEDIUM', birthDate: '2021-06-01' })
    await createPet(ctx.app, near.token, {
      name: 'Grandão',
      size: 'LARGE',
      birthDate: '2015-01-01',
    })
    await createPet(ctx.app, near.token, { name: 'Sem idade', size: 'SMALL', birthDate: null })

    const all = await feed(me.token, myPet.id)
    const twin = all.items.find((item) => item.pet.name === 'Gêmeo')
    const big = all.items.find((item) => item.pet.name === 'Grandão')
    expect(twin?.affinity.reasons).toEqual(
      expect.arrayContaining(['Mesmo porte', 'Idades parecidas', 'Bem pertinho']),
    )
    expect(twin?.affinity.score).toBeGreaterThan(big?.affinity.score ?? 100)

    const medium = await feed(me.token, myPet.id, '&sizes=MEDIUM')
    expect(medium.items.map((item) => item.pet.name)).toEqual(['Gêmeo'])
    const young = await feed(me.token, myPet.id, '&maxAge=6')
    expect(young.items.map((item) => item.pet.name)).toEqual(['Gêmeo'])
    const senior = await feed(me.token, myPet.id, '&minAge=8')
    expect(senior.items.map((item) => item.pet.name)).toEqual(['Grandão'])
  })

  it('recusa filtro malformado', async () => {
    const me = await registerOwner(ctx.app)
    const myPet = await createPet(ctx.app, me.token)
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/feed?petId=${myPet.id}&sizes=GIGANTE`,
      headers: auth(me.token),
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('swipe e match', () => {
  it('cria match quando os dois lados curtem e lista para ambos', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token, { name: 'Thor' })
    const luna = await createPet(ctx.app, bruno.token, { name: 'Luna', sex: 'FEMALE' })

    const first = await swipe(ana.token, thor.id, luna.id)
    expect(first.json<SwipeResult>().match).toBeNull()
    const second = await swipe(bruno.token, luna.id, thor.id)
    const match = second.json<SwipeResult>().match
    expect(match?.otherPet.id).toBe(thor.id)
    expect(match?.myPet.id).toBe(luna.id)

    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/matches',
      headers: auth(ana.token),
    })
    expect(list.json<MatchSummary[]>().map((m) => m.otherPet.name)).toEqual(['Luna'])
  })

  it('PASS não gera match e swipe repetido é recusado', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    const luna = await createPet(ctx.app, bruno.token)
    await swipe(ana.token, thor.id, luna.id, 'PASS')
    expect((await swipe(bruno.token, luna.id, thor.id)).json<SwipeResult>().match).toBeNull()
    const repeated = await swipe(ana.token, thor.id, luna.id)
    expect(repeated.statusCode).toBe(409)
  })

  it('likes simultâneos geram exatamente um match', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    const luna = await createPet(ctx.app, bruno.token)
    const results = await Promise.all([
      swipe(ana.token, thor.id, luna.id),
      swipe(bruno.token, luna.id, thor.id),
    ])
    expect(results.map((r) => r.statusCode)).toEqual([201, 201])
    expect(results.filter((r) => r.json<SwipeResult>().match).length).toBe(1)
    expect(await db.match.count()).toBe(1)
  })

  it('recusa swipe entre pets incompatíveis ou com o próprio pet', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const dog = await createPet(ctx.app, ana.token)
    const ownOther = await createPet(ctx.app, ana.token)
    const cat = await createPet(ctx.app, bruno.token, { species: 'CAT' })
    expect((await swipe(ana.token, dog.id, cat.id)).json().error.code).toBe('INCOMPATIBLE_PETS')
    expect((await swipe(ana.token, dog.id, ownOther.id)).statusCode).toBe(400)
  })

  it('bloqueio desfaz o match e esconde a conversa', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    const luna = await createPet(ctx.app, bruno.token)
    await swipe(ana.token, thor.id, luna.id)
    const match = (await swipe(bruno.token, luna.id, thor.id)).json<SwipeResult>().match
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${bruno.user.id}/block`,
      headers: auth(ana.token),
    })
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/matches',
      headers: auth(bruno.token),
    })
    expect(list.json()).toEqual([])
    const messages = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/matches/${match?.id}/messages`,
      headers: auth(bruno.token),
    })
    expect(messages.statusCode).toBe(404)
  })
})
