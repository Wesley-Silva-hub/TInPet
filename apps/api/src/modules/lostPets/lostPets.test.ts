import type {
  LostPetAlertDetail,
  LostPetAlertSummary,
  Notification,
  Page,
  Pet,
  PublicTag,
  Sighting,
} from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setLocation, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

// Teresina: Jóquei, Fátima (≈1 km) e Parnaíba (≈340 km)
const JOQUEI = { latitude: -5.0762, longitude: -42.7895 }
const FATIMA = { latitude: -5.0681, longitude: -42.7926 }
const PARNAIBA = { latitude: -2.9055, longitude: -41.7769 }

async function ownerAt(point: { latitude: number; longitude: number }, name?: string) {
  const owner = await registerOwner(ctx.app, { name })
  await setLocation(ctx.app, owner.token, point.latitude, point.longitude)
  return owner
}

async function reportLost(token: string, petId: string, overrides: Record<string, unknown> = {}) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/lost-pets',
    headers: auth(token),
    payload: {
      petId,
      description: 'Coleira vermelha, atende por Bento',
      rewardCents: 20000,
      neighborhood: 'Jóquei',
      lastSeenAt: new Date(Date.now() - 3_600_000).toISOString(),
      ...JOQUEI,
      ...overrides,
    },
  })
}

const notificationsOf = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(token) })
  ).json<Page<Notification>>().items

describe('pet perdido', () => {
  it('avisa só os vizinhos dentro do raio, e o pet passa a mostrar o alerta', async () => {
    const tutor = await ownerAt(JOQUEI, 'Rafael Lima')
    const vizinha = await ownerAt(FATIMA)
    const longe = await ownerAt(PARNAIBA)
    const pet = await createPet(ctx.app, tutor.token, { name: 'Bento' })

    const response = await reportLost(tutor.token, pet.id)
    expect(response.statusCode).toBe(201)
    const alert = response.json<LostPetAlertSummary & { notified: number }>()
    expect(alert.notified).toBe(1)

    const [aviso] = await notificationsOf(vizinha.token)
    expect(aviso).toMatchObject({
      type: 'LOST_PET_NEARBY',
      alertId: alert.id,
      petName: 'Bento',
      preview: 'Bento sumiu perto de Jóquei',
    })
    expect(await notificationsOf(longe.token)).toEqual([])
    expect(await notificationsOf(tutor.token)).toEqual([])

    const petNow = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/pets/${pet.id}`,
      headers: auth(vizinha.token),
    })
    expect(petNow.json<Pet>().activeAlertId).toBe(alert.id)
  })

  it('não expõe coordenadas e só permite um alerta aberto por pet, criado pelo tutor', async () => {
    const tutor = await ownerAt(JOQUEI)
    const outro = await ownerAt(FATIMA)
    const pet = await createPet(ctx.app, tutor.token)

    expect((await reportLost(outro.token, pet.id)).statusCode).toBe(403)
    expect((await reportLost(tutor.token, pet.id)).statusCode).toBe(201)
    expect((await reportLost(tutor.token, pet.id)).json().error.code).toBe('ALERT_EXISTS')

    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/lost-pets',
      headers: auth(outro.token),
    })
    const body = list.body
    expect(list.json<LostPetAlertSummary[]>()[0]).toMatchObject({ distanceKm: 1, isMine: false })
    expect(body).not.toMatch(/latitude|longitude|-5\.07/)
  })

  it('avistamento: local só para o tutor, e quem ajudou é avisado quando o pet aparece', async () => {
    const tutor = await ownerAt(JOQUEI)
    const ajudante = await ownerAt(FATIMA)
    const curioso = await ownerAt(FATIMA)
    const pet = await createPet(ctx.app, tutor.token, { name: 'Pipoca' })
    const alert = (await reportLost(tutor.token, pet.id)).json<LostPetAlertSummary>()

    const sighting = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/lost-pets/${alert.id}/sightings`,
      headers: auth(ajudante.token),
      payload: { message: 'Vi na praça do Fátima agora', latitude: -5.06812, longitude: -42.79261 },
    })
    expect(sighting.statusCode).toBe(204)
    const ownSighting = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/lost-pets/${alert.id}/sightings`,
      headers: auth(tutor.token),
      payload: { message: 'Teste do tutor', latitude: null, longitude: null },
    })
    expect(ownSighting.statusCode).toBe(403)

    const detail = (token: string) =>
      ctx.app.inject({ method: 'GET', url: `/api/v1/lost-pets/${alert.id}`, headers: auth(token) })
    const forOwner = (await detail(tutor.token)).json<LostPetAlertDetail>()
    expect(forOwner.sightings).toHaveLength(1)
    expect(forOwner.sightings[0]?.mapsUrl).toContain('-5.068,-42.793')
    const forOther = (await detail(curioso.token)).json<LostPetAlertDetail>()
    expect(forOther).toMatchObject({ sightings: [], sightingCount: 1, reportedByMe: false })
    expect((await detail(ajudante.token)).json<LostPetAlertDetail>().reportedByMe).toBe(true)
    expect((await notificationsOf(tutor.token))[0]?.type).toBe('LOST_PET_SIGHTING')

    const found = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/lost-pets/${alert.id}/resolve`,
      headers: auth(tutor.token),
      payload: { status: 'FOUND' },
    })
    expect(found.json<LostPetAlertSummary>().status).toBe('FOUND')
    expect((await notificationsOf(ajudante.token))[0]?.type).toBe('LOST_PET_FOUND')
    const late = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/lost-pets/${alert.id}/sightings`,
      headers: auth(curioso.token),
      payload: { message: 'Vi agora', latitude: null, longitude: null },
    })
    expect(late.json().error.code).toBe('ALERT_CLOSED')
  })
  it('sem GPS usa a localização cadastrada; sem nenhuma, pede para ativar', async () => {
    const tutor = await ownerAt(JOQUEI)
    const vizinha = await ownerAt(FATIMA)
    const pet = await createPet(ctx.app, tutor.token)
    const response = await reportLost(tutor.token, pet.id, { latitude: null, longitude: null })
    expect(response.json<{ notified: number }>().notified).toBe(1)
    expect((await notificationsOf(vizinha.token))[0]?.type).toBe('LOST_PET_NEARBY')

    const semLocal = await registerOwner(ctx.app)
    const outroPet = await createPet(ctx.app, semLocal.token)
    const blocked = await reportLost(semLocal.token, outroPet.id, {
      latitude: null,
      longitude: null,
    })
    expect(blocked.json().error.code).toBe('NO_LOCATION')
  })
})

describe('plaquinha QR', () => {
  it('quem acha o pet, sem conta, avisa o tutor; a página não expõe o tutor', async () => {
    const tutor = await ownerAt(JOQUEI, 'Larissa Moura Costa')
    const pet = await createPet(ctx.app, tutor.token, { name: 'Kira' })
    const tag = (
      await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/pets/${pet.id}/tag`,
        headers: auth(tutor.token),
      })
    ).json<{ tagCode: string }>()
    expect(tag.tagCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    const again = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/tag`,
      headers: auth(tutor.token),
    })
    expect(again.json()).toEqual(tag)

    const page = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/tags/${tag.tagCode.toLowerCase()}`,
    })
    expect(page.json<PublicTag>()).toMatchObject({
      petName: 'Kira',
      ownerFirstName: 'Larissa',
      isLost: false,
    })
    expect(page.body).not.toMatch(/Moura|@teste\.dev|latitude/)

    const found = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/tags/${tag.tagCode}/found`,
      remoteAddress: '10.9.9.9',
      payload: {
        message: 'Está comigo, perto do shopping',
        contact: '(86) 99999-0000',
        latitude: null,
        longitude: null,
      },
    })
    expect(found.statusCode).toBe(204)
    const [aviso] = await notificationsOf(tutor.token)
    expect(aviso).toMatchObject({ type: 'LOST_PET_SIGHTING', actor: null, petId: pet.id })
    expect(aviso?.preview).toContain('(86) 99999-0000')

    const reports = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/pets/${pet.id}/tag-reports`,
      headers: auth(tutor.token),
    })
    expect(reports.json<Sighting[]>()[0]).toMatchObject({
      source: 'TAG',
      contact: '(86) 99999-0000',
    })
  })

  it('plaquinha de pet perdido mostra a recompensa; código inexistente dá 404', async () => {
    const tutor = await ownerAt(JOQUEI)
    const pet = await createPet(ctx.app, tutor.token)
    const { tagCode } = (
      await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/pets/${pet.id}/tag`,
        headers: auth(tutor.token),
      })
    ).json<{ tagCode: string }>()
    await reportLost(tutor.token, pet.id)
    const page = await ctx.app.inject({ method: 'GET', url: `/api/v1/tags/${tagCode}` })
    expect(page.json<PublicTag>()).toMatchObject({ isLost: true, rewardCents: 20000 })
    expect(
      (await ctx.app.inject({ method: 'GET', url: '/api/v1/tags/NAOEXISTE' })).statusCode,
    ).toBe(404)
    expect(await db.pet.count({ where: { tagCode } })).toBe(1)
  })
})
