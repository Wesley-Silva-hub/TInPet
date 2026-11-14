import type { Notification, Page, PetEvent, PetEventDetail } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import type { App } from '../../app'
import { auth, registerOwner, setLocation, setupTestApp } from '../../test/helpers'
import { MAX_OPEN_EVENTS } from './service'

const ctx = setupTestApp()

// Teresina: Jóquei (base), Fátima (~2 km) e Timon (~9 km); Parnaíba fica a ~300 km
const JOQUEI = [-5.07, -42.79] as const
const FATIMA = [-5.08, -42.78] as const
const PARNAIBA = [-2.9, -41.77] as const

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

async function owner(app: App, [lat, lng]: readonly [number, number]) {
  const person = await registerOwner(app)
  await setLocation(app, person.token, lat, lng)
  return person
}

let request = 0

function createEvent(token: string, overrides: Record<string, unknown> = {}) {
  request++
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/events',
    // IP distinto por chamada: o rate limit de criação continua ativo nos testes
    remoteAddress: `10.50.${Math.floor(request / 250)}.${request % 250}`,
    headers: auth(token),
    payload: {
      title: 'Cãominhada no parque',
      description: 'Traga água e saquinho',
      kind: 'WALK',
      species: ['DOG'],
      startsAt: inDays(3),
      endsAt: null,
      place: 'Parque da Cidadania',
      neighborhood: 'Centro',
      latitude: null,
      longitude: null,
      ...overrides,
    },
  })
}

const notificationsOf = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(token) })
  ).json<Page<Notification>>().items

describe('eventos de pets', () => {
  it('cria o evento e avisa só os tutores num raio de 10 km', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    const near = await owner(ctx.app, FATIMA)
    const far = await owner(ctx.app, PARNAIBA)

    const response = await createEvent(organizer.token)
    expect(response.statusCode).toBe(201)
    const event = response.json<PetEventDetail & { notified: number }>()
    expect(event.notified).toBe(1)
    expect(event.isMine).toBe(true)

    const nearNotifications = await notificationsOf(near.token)
    expect(nearNotifications[0]).toMatchObject({ type: 'EVENT_NEARBY', eventId: event.id })
    expect(nearNotifications[0]?.preview).toContain('Cãominhada no parque')
    expect(await notificationsOf(far.token)).toHaveLength(0)
    expect(await notificationsOf(organizer.token)).toHaveLength(0)
  })

  it('lista os próximos eventos perto, com distância e sem coordenadas', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    const near = await owner(ctx.app, FATIMA)
    const far = await owner(ctx.app, PARNAIBA)
    await createEvent(organizer.token, { title: 'Daqui a uma semana', startsAt: inDays(7) })
    await createEvent(organizer.token, { title: 'Amanhã', startsAt: inDays(1) })

    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/events',
      headers: auth(near.token),
    })
    expect(list.statusCode).toBe(200)
    const events = list.json<PetEvent[]>()
    expect(events.map((event) => event.title)).toEqual(['Amanhã', 'Daqui a uma semana'])
    expect(events[0]?.distanceKm).toBeGreaterThanOrEqual(1)
    expect(list.body).not.toMatch(/latitude|longitude|-5\.07|-42\.79/)

    const farList = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/events',
      headers: auth(far.token),
    })
    expect(farList.json<PetEvent[]>()).toHaveLength(0)
  })

  it('confirma e desfaz presença', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    const guest = await owner(ctx.app, FATIMA)
    const { id } = (await createEvent(organizer.token)).json<PetEventDetail>()

    const going = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/attend`,
      headers: auth(guest.token),
    })
    expect(going.json<PetEventDetail>()).toMatchObject({ going: true, attendeeCount: 1 })
    expect(going.json<PetEventDetail>().attendees[0]?.id).toBe(guest.user.id)
    // Confirmar de novo não duplica
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/attend`,
      headers: auth(guest.token),
    })
    const notGoing = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/events/${id}/attend`,
      headers: auth(guest.token),
    })
    expect(notGoing.json<PetEventDetail>()).toMatchObject({ going: false, attendeeCount: 0 })
  })

  it('só quem organiza cancela, e quem ia é avisado', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    const guest = await owner(ctx.app, PARNAIBA)
    const { id } = (await createEvent(organizer.token)).json<PetEventDetail>()
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/attend`,
      headers: auth(guest.token),
    })

    const denied = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/cancel`,
      headers: auth(guest.token),
    })
    expect(denied.statusCode).toBe(403)

    const cancelled = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/cancel`,
      headers: auth(organizer.token),
    })
    expect(cancelled.json<PetEventDetail>().cancelled).toBe(true)
    expect((await notificationsOf(guest.token))[0]).toMatchObject({
      type: 'EVENT_CANCELLED',
      eventId: id,
    })
    const attendAgain = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/events/${id}/attend`,
      headers: auth(guest.token),
    })
    expect(attendAgain.statusCode).toBe(400)
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/events',
      headers: auth(guest.token),
    })
    expect(list.json<PetEvent[]>()).toHaveLength(0)
  })

  it('bloqueio esconde os eventos de quem foi bloqueado', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    const viewer = await owner(ctx.app, FATIMA)
    const { id } = (await createEvent(organizer.token)).json<PetEventDetail>()
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${organizer.user.id}/block`,
      headers: auth(viewer.token),
    })
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/events',
      headers: auth(viewer.token),
    })
    expect(list.json<PetEvent[]>()).toHaveLength(0)
    const detail = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/events/${id}`,
      headers: auth(viewer.token),
    })
    expect(detail.statusCode).toBe(404)
  })

  it('valida datas, exige localização e limita eventos abertos', async () => {
    const organizer = await owner(ctx.app, JOQUEI)
    expect((await createEvent(organizer.token, { startsAt: inDays(-1) })).statusCode).toBe(400)
    expect((await createEvent(organizer.token, { startsAt: inDays(400) })).statusCode).toBe(400)
    const endsBefore = await createEvent(organizer.token, { endsAt: inDays(2) })
    expect(endsBefore.statusCode).toBe(400)

    const noLocation = await registerOwner(ctx.app)
    const response = await createEvent(noLocation.token)
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('NO_LOCATION')

    for (let i = 0; i < MAX_OPEN_EVENTS; i++) {
      expect((await createEvent(organizer.token)).statusCode).toBe(201)
    }
    const overLimit = await createEvent(organizer.token)
    expect(overLimit.statusCode).toBe(400)
    expect(overLimit.json().error.code).toBe('EVENT_LIMIT')
  })
})
