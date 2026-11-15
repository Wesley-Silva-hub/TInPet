import {
  type HealthRecord,
  type Medication,
  type Notification,
  nextDose,
  type Page,
} from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setupTestApp } from '../../test/helpers'
import { sendHealthReminders } from './reminders'
import { todayInBrazil } from './service'

const ctx = setupTestApp()

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const isoDate = (time: number) => todayInBrazil(new Date(time))

const notificationsOf = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/notifications', headers: auth(token) })
  ).json<Page<Notification>>().items

describe('próxima dose', () => {
  const first = '2026-11-10T08:00:00-03:00'
  it('calcula a próxima dose a partir da primeira e do intervalo', () => {
    const next = nextDose(
      { firstDoseAt: first, everyHours: 12, endsOn: null },
      new Date('2026-11-14T09:00:00-03:00'),
    )
    expect(next?.toISOString()).toBe(new Date('2026-11-14T20:00:00-03:00').toISOString())
  })

  it('antes da primeira dose, a próxima é a primeira; depois do fim, não há próxima', () => {
    const before = nextDose(
      { firstDoseAt: first, everyHours: 8, endsOn: null },
      new Date('2026-11-01T00:00:00Z'),
    )
    expect(before?.toISOString()).toBe(new Date(first).toISOString())
    const ended = nextDose(
      { firstDoseAt: first, everyHours: 24, endsOn: '2026-11-12' },
      new Date('2026-11-14T09:00:00-03:00'),
    )
    expect(ended).toBeNull()
  })
})

describe('remédios e histórico de saúde', () => {
  it('cadastra remédio com próxima dose e encerra o tratamento', async () => {
    const owner = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token, { name: 'Thor' })
    const created = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/medications`,
      headers: auth(owner.token),
      payload: {
        name: 'Amoxicilina',
        dosage: '250 mg',
        everyHours: 12,
        firstDoseAt: new Date(Date.now() - 2 * HOUR).toISOString(),
        endsOn: isoDate(Date.now() + 5 * DAY),
        notes: '',
      },
    })
    expect(created.statusCode).toBe(201)
    const medication = created.json<Medication>()
    expect(medication.active).toBe(true)
    expect(Date.parse(medication.nextDoseAt as string)).toBeGreaterThan(Date.now())

    const finished = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/medications/${medication.id}/finish`,
      headers: auth(owner.token),
    })
    expect(finished.json<Medication>().endsOn).not.toBeNull()
  })

  it('valida intervalo e só o tutor vê ou mexe na saúde do pet', async () => {
    const owner = await registerOwner(ctx.app)
    const stranger = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    const invalid = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/medications`,
      headers: auth(owner.token),
      payload: { name: 'X', everyHours: 0, firstDoseAt: new Date().toISOString() },
    })
    expect(invalid.statusCode).toBe(400)

    for (const url of [
      `/api/v1/pets/${pet.id}/medications`,
      `/api/v1/pets/${pet.id}/health-records`,
    ]) {
      const response = await ctx.app.inject({ method: 'GET', url, headers: auth(stranger.token) })
      expect(response.statusCode).toBe(403)
    }
  })

  it('registra pesagem em gramas inteiros e exige o peso', async () => {
    const owner = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    const noWeight = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/health-records`,
      headers: auth(owner.token),
      payload: { kind: 'WEIGHT', date: isoDate(Date.now()) },
    })
    expect(noWeight.statusCode).toBe(400)

    const weight = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/health-records`,
      headers: auth(owner.token),
      payload: { kind: 'WEIGHT', date: isoDate(Date.now()), weightKg: 12.35 },
    })
    expect(weight.json<HealthRecord>().weightKg).toBe(12.35)
    const stored = await db.petHealthRecord.findFirstOrThrow({ where: { petId: pet.id } })
    expect(stored.weightGrams).toBe(12350)

    const future = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/health-records`,
      headers: auth(owner.token),
      payload: { kind: 'CONSULTATION', title: 'Retorno', date: isoDate(Date.now() + 3 * DAY) },
    })
    expect(future.statusCode).toBe(400)
  })
})

describe('lembretes de saúde', () => {
  it('avisa reforço de vacina e remédio do dia uma vez só, mesmo rodando de novo', async () => {
    const owner = await registerOwner(ctx.app)
    const other = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token, { name: 'Mel' })
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/vaccines`,
      headers: auth(owner.token),
      payload: {
        name: 'Antirrábica',
        appliedAt: isoDate(Date.now() - 360 * DAY),
        nextDueAt: isoDate(Date.now() + 5 * DAY),
        clinic: '',
        notes: '',
      },
    })
    // Vacina com reforço longe: não avisa
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/vaccines`,
      headers: auth(owner.token),
      payload: {
        name: 'V10',
        appliedAt: isoDate(Date.now() - 10 * DAY),
        nextDueAt: isoDate(Date.now() + 200 * DAY),
        clinic: '',
        notes: '',
      },
    })
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/medications`,
      headers: auth(owner.token),
      payload: {
        name: 'Vermífugo',
        everyHours: 24,
        firstDoseAt: new Date(Date.now() - DAY).toISOString(),
      },
    })

    expect(await sendHealthReminders(ctx.app.deps)).toBe(2)
    expect(await sendHealthReminders(ctx.app.deps)).toBe(0)

    const items = await notificationsOf(owner.token)
    expect(items.map((item) => item.type).sort()).toEqual(['MEDICATION_TODAY', 'VACCINE_DUE'])
    const vaccine = items.find((item) => item.type === 'VACCINE_DUE')
    expect(vaccine?.preview).toContain('Antirrábica de Mel vence em 5 dias')
    expect(vaccine?.petId).toBe(pet.id)
    expect(await notificationsOf(other.token)).toHaveLength(0)
  })

  it('não lembra reforço de vacina que já foi reaplicada', async () => {
    const owner = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    for (const appliedDaysAgo of [360, 2]) {
      await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/pets/${pet.id}/vaccines`,
        headers: auth(owner.token),
        payload: {
          name: 'Antirrábica',
          appliedAt: isoDate(Date.now() - appliedDaysAgo * DAY),
          nextDueAt: isoDate(Date.now() + (appliedDaysAgo === 360 ? 3 : 363) * DAY),
          clinic: '',
          notes: '',
        },
      })
    }
    expect(await sendHealthReminders(ctx.app.deps)).toBe(0)
  })
})
