import type { Pet, Vaccine, VaccineReminder } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const day = (offset: number) =>
  new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

async function addVaccine(token: string, petId: string, payload: Record<string, unknown>) {
  return ctx.app.inject({
    method: 'POST',
    url: `/api/v1/pets/${petId}/vaccines`,
    headers: auth(token),
    payload: { clinic: '', notes: '', nextDueAt: null, ...payload },
  })
}

describe('carteira de vacinação', () => {
  it('só o tutor vê e altera; os outros veem apenas o selo', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)

    const created = await addVaccine(ana.token, thor.id, {
      name: 'Antirrábica',
      appliedAt: day(-30),
      nextDueAt: day(335),
    })
    expect(created.statusCode).toBe(201)

    const intruder = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/pets/${thor.id}/vaccines`,
      headers: auth(bruno.token),
    })
    expect(intruder.statusCode).toBe(403)
    expect(
      (await addVaccine(bruno.token, thor.id, { name: 'V10', appliedAt: day(-1) })).statusCode,
    ).toBe(403)

    const publicPet = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/pets/${thor.id}`,
      headers: auth(bruno.token),
    })
    expect(publicPet.json<Pet>().vaccineStatus).toBe('UP_TO_DATE')
    expect(publicPet.body).not.toContain('Antirrábica')
  })

  it('valida datas: aplicação no futuro e reforço antes da aplicação', async () => {
    const ana = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    expect(
      (await addVaccine(ana.token, thor.id, { name: 'V10', appliedAt: day(5) })).statusCode,
    ).toBe(400)
    const wrongOrder = await addVaccine(ana.token, thor.id, {
      name: 'V10',
      appliedAt: day(-10),
      nextDueAt: day(-20),
    })
    expect(wrongOrder.statusCode).toBe(400)
  })

  it('lembra reforços próximos e atrasados; reaplicar faz o lembrete sumir', async () => {
    const ana = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token, { name: 'Thor' })
    await addVaccine(ana.token, thor.id, { name: 'V10', appliedAt: day(-360), nextDueAt: day(5) })
    await addVaccine(ana.token, thor.id, {
      name: 'Gripe',
      appliedAt: day(-400),
      nextDueAt: day(-3),
    })
    await addVaccine(ana.token, thor.id, {
      name: 'Antirrábica',
      appliedAt: day(-10),
      nextDueAt: day(355),
    })

    const reminders = async () =>
      (
        await ctx.app.inject({
          method: 'GET',
          url: '/api/v1/me/vaccine-reminders',
          headers: auth(ana.token),
        })
      ).json<VaccineReminder[]>()

    expect((await reminders()).map((r) => [r.vaccineName, r.daysLeft])).toEqual([
      ['Gripe', -3],
      ['V10', 5],
    ])
    const pet = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/pets/${thor.id}`,
      headers: auth(ana.token),
    })
    expect(pet.json<Pet>().vaccineStatus).toBe('OVERDUE')

    // Reaplicou a gripe hoje: o lembrete antigo some
    await addVaccine(ana.token, thor.id, { name: 'gripe', appliedAt: day(0), nextDueAt: day(365) })
    expect((await reminders()).map((r) => r.vaccineName)).toEqual(['V10'])
  })

  it('apaga vacina só do próprio pet', async () => {
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const thor = await createPet(ctx.app, ana.token)
    const vaccine = (
      await addVaccine(ana.token, thor.id, { name: 'V10', appliedAt: day(-1) })
    ).json<Vaccine>()
    const denied = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/vaccines/${vaccine.id}`,
      headers: auth(bruno.token),
    })
    expect(denied.statusCode).toBe(403)
    const ok = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/vaccines/${vaccine.id}`,
      headers: auth(ana.token),
    })
    expect(ok.statusCode).toBe(204)
  })
})
