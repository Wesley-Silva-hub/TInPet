import type { Notification, Page, Walk, Walker } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import type { App } from '../../app'
import { auth, createPet, db, registerOwner, setLocation, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const HOUR = 60 * 60 * 1000
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

async function walker(app: App, weekdays = ALL_DAYS) {
  const person = await registerOwner(app, { name: 'Paula Passeadora' })
  await setLocation(app, person.token, -5.07, -42.79)
  const saved = await app.inject({
    method: 'PUT',
    url: '/api/v1/walkers/me',
    headers: auth(person.token),
    payload: {
      bio: 'Passeio com carinho',
      priceCents: 3500,
      walkMinutes: 45,
      neighborhoods: 'Jóquei, Fátima',
      species: ['DOG'],
      weekdays,
    },
  })
  expect(saved.statusCode).toBe(200)
  return person
}

async function tutor(app: App) {
  const person = await registerOwner(app)
  await setLocation(app, person.token, -5.08, -42.78)
  const pet = await createPet(app, person.token, { name: 'Thor', species: 'DOG' })
  return { ...person, pet }
}

const request = (token: string, payload: Record<string, unknown>) =>
  ctx.app.inject({ method: 'POST', url: '/api/v1/walks', headers: auth(token), payload })

const act = (token: string, walkId: string, action: string, note = '') =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/walks/${walkId}/${action}`,
    headers: auth(token),
    payload: ['accept', 'decline'].includes(action) ? { note } : undefined,
  })

const notificationsOf = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(token) })
  ).json<Page<Notification>>().items

describe('passeadores', () => {
  it('lista passeadores por perto com preço e sem coordenadas', async () => {
    const paula = await walker(ctx.app)
    const ana = await tutor(ctx.app)
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/walkers?species=DOG',
      headers: auth(ana.token),
    })
    const walkers = list.json<Walker[]>()
    expect(walkers).toHaveLength(1)
    expect(walkers[0]).toMatchObject({ id: paula.user.id, priceCents: 3500, completedWalks: 0 })
    expect(walkers[0]?.distanceKm).toBeGreaterThanOrEqual(1)
    expect(list.body).not.toMatch(/latitude|longitude/)

    const cats = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/walkers?species=CAT',
      headers: auth(ana.token),
    })
    expect(cats.json<Walker[]>()).toHaveLength(0)
  })

  it('pedido, aceite e conclusão avisam cada lado e contam no perfil', async () => {
    const paula = await walker(ctx.app)
    const ana = await tutor(ctx.app)
    const startsAt = new Date(Date.now() + 26 * HOUR).toISOString()
    const created = await request(ana.token, {
      walkerId: paula.user.id,
      petId: ana.pet.id,
      startsAt,
      durationMinutes: 45,
      note: 'Ele puxa a guia',
    })
    expect(created.statusCode).toBe(201)
    const walk = created.json<Walk>()
    expect(walk).toMatchObject({ status: 'REQUESTED', priceCents: 3500, myRole: 'OWNER' })
    expect((await notificationsOf(paula.token))[0]).toMatchObject({
      type: 'WALK_REQUESTED',
      walkId: walk.id,
    })

    // Só o passeador responde
    expect((await act(ana.token, walk.id, 'accept')).statusCode).toBe(403)
    const accepted = await act(paula.token, walk.id, 'accept', 'Combinado, levo água!')
    expect(accepted.json<Walk>()).toMatchObject({ status: 'ACCEPTED', myRole: 'WALKER' })
    expect((await notificationsOf(ana.token))[0]?.type).toBe('WALK_ACCEPTED')
    // Não dá para aceitar de novo
    expect((await act(paula.token, walk.id, 'accept')).statusCode).toBe(409)
    // Ainda não aconteceu
    expect((await act(paula.token, walk.id, 'done')).statusCode).toBe(400)

    await db.walkRequest.update({
      where: { id: walk.id },
      data: { startsAt: new Date(Date.now() - HOUR) },
    })
    expect((await act(paula.token, walk.id, 'done')).json<Walk>().status).toBe('DONE')
    const profile = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/walkers/${paula.user.id}`,
      headers: auth(ana.token),
    })
    expect(profile.json<Walker>().completedWalks).toBe(1)
  })

  it('recusa choque de horário, dia de folga, pet de outra pessoa e pedido muito em cima', async () => {
    const paula = await walker(ctx.app)
    const ana = await tutor(ctx.app)
    const bia = await tutor(ctx.app)
    const at = new Date(Date.now() + 50 * HOUR)
    const first = await request(ana.token, {
      walkerId: paula.user.id,
      petId: ana.pet.id,
      startsAt: at.toISOString(),
      durationMinutes: 60,
    })
    await act(paula.token, first.json<Walk>().id, 'accept')

    const overlap = await request(bia.token, {
      walkerId: paula.user.id,
      petId: bia.pet.id,
      startsAt: new Date(at.getTime() + 30 * 60 * 1000).toISOString(),
      durationMinutes: 30,
    })
    expect(overlap.statusCode).toBe(409)
    expect(overlap.json().error.code).toBe('WALKER_BUSY')

    const notMine = await request(bia.token, {
      walkerId: paula.user.id,
      petId: ana.pet.id,
      startsAt: new Date(at.getTime() + 5 * HOUR).toISOString(),
      durationMinutes: 30,
    })
    expect(notMine.json().error.code).toBe('INVALID_PET')

    const soon = await request(bia.token, {
      walkerId: paula.user.id,
      petId: bia.pet.id,
      startsAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      durationMinutes: 30,
    })
    expect(soon.json().error.code).toBe('WALK_TOO_SOON')

    const weekendOff = await walker(ctx.app, [1, 2, 3, 4, 5])
    const sunday = new Date()
    sunday.setUTCDate(sunday.getUTCDate() + ((7 - sunday.getUTCDay()) % 7 || 7))
    sunday.setUTCHours(15, 0, 0, 0)
    const dayOff = await request(bia.token, {
      walkerId: weekendOff.user.id,
      petId: bia.pet.id,
      startsAt: sunday.toISOString(),
      durationMinutes: 30,
    })
    expect(dayOff.json().error.code).toBe('WALKER_DAY_OFF')
  })

  it('qualquer lado cancela antes do horário e o outro é avisado; bloqueio esconde', async () => {
    const paula = await walker(ctx.app)
    const ana = await tutor(ctx.app)
    const created = await request(ana.token, {
      walkerId: paula.user.id,
      petId: ana.pet.id,
      startsAt: new Date(Date.now() + 30 * HOUR).toISOString(),
      durationMinutes: 30,
    })
    const cancelled = await act(paula.token, created.json<Walk>().id, 'cancel')
    expect(cancelled.json<Walk>().status).toBe('CANCELLED')
    expect((await notificationsOf(ana.token))[0]?.type).toBe('WALK_CANCELLED')

    const stranger = await registerOwner(ctx.app)
    const peek = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/walks/${created.json<Walk>().id}/cancel`,
      headers: auth(stranger.token),
    })
    expect(peek.statusCode).toBe(404)

    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${paula.user.id}/block`,
      headers: auth(ana.token),
    })
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/walkers',
      headers: auth(ana.token),
    })
    expect(list.json<Walker[]>()).toHaveLength(0)
  })

  it('empresa não vira passeador e é preciso ter localização', async () => {
    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    const payload = { priceCents: 0, walkMinutes: 30, species: ['DOG'], weekdays: [1] }
    const denied = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/walkers/me',
      headers: auth(company.token),
      payload,
    })
    expect(denied.statusCode).toBe(403)
    const noLocation = await registerOwner(ctx.app)
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/walkers/me',
      headers: auth(noLocation.token),
      payload,
    })
    expect(response.json().error.code).toBe('NO_LOCATION')
  })
})
