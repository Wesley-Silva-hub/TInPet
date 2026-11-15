import type { Timeline } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const timelineOf = async (token: string, petId: string) =>
  ctx.app.inject({ method: 'GET', url: `/api/v1/pets/${petId}/timeline`, headers: auth(token) })

describe('linha do tempo do pet', () => {
  it('tutor vê marcos, fotos e saúde; visitante vê só o que é público', async () => {
    const owner = await registerOwner(ctx.app)
    const visitor = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token, { name: 'Thor', birthDate: '2022-03-10' })
    const other = await createPet(ctx.app, visitor.token, { name: 'Luna' })
    await db.post.create({
      data: {
        authorId: owner.user.id,
        petId: pet.id,
        imageKey: 'posts/x.webp',
        caption: 'Primeiro banho',
        createdAt: new Date('2024-05-01T12:00:00Z'),
      },
    })
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/vaccines`,
      headers: auth(owner.token),
      payload: {
        name: 'Antirrábica',
        appliedAt: '2024-06-01',
        nextDueAt: null,
        clinic: 'Vet Sul',
        notes: '',
      },
    })
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/health-records`,
      headers: auth(owner.token),
      payload: { kind: 'WEIGHT', date: '2024-07-01', weightKg: 12.4 },
    })
    const [petAId, petBId] = [pet.id, other.id].sort()
    await db.match.create({ data: { petAId: petAId as string, petBId: petBId as string } })

    const mine = (await timelineOf(owner.token, pet.id)).json<Timeline>()
    expect(mine.isMine).toBe(true)
    expect(mine.items.map((item) => item.kind).sort()).toEqual(
      ['BIRTH', 'FIRST_MATCH', 'JOINED', 'POST', 'VACCINE', 'WEIGHT'].sort(),
    )
    expect(mine.items.find((item) => item.kind === 'WEIGHT')?.title).toBe('Pesou 12,4 kg')
    expect(mine.items.find((item) => item.kind === 'FIRST_MATCH')?.title).toBe(
      'Primeiro match: Luna',
    )
    // Mais recente primeiro
    const dates = mine.items.map((item) => item.date)
    expect([...dates].sort().reverse()).toEqual(dates)

    const response = await timelineOf(visitor.token, pet.id)
    const theirs = response.json<Timeline>()
    expect(theirs.isMine).toBe(false)
    expect(theirs.items.map((item) => item.kind).sort()).toEqual(['BIRTH', 'JOINED', 'POST'])
    expect(response.body).not.toMatch(/Antirrábica|Vet Sul|12,4|Luna/)
  })

  it('bloqueio esconde a linha do tempo', async () => {
    const owner = await registerOwner(ctx.app)
    const visitor = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/users/${visitor.user.id}/block`,
      headers: auth(owner.token),
    })
    expect((await timelineOf(visitor.token, pet.id)).statusCode).toBe(404)
  })
})
