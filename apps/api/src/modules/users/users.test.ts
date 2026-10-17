import { existsSync } from 'node:fs'
import type { Me } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import {
  auth,
  createPet,
  db,
  imageMultipart,
  registerOwner,
  setLocation,
  setupTestApp,
  storage,
} from '../../test/helpers'

const ctx = setupTestApp()

describe('perfil e LGPD', () => {
  it('guarda a localização arredondada (~1 km)', async () => {
    const { token, user } = await registerOwner(ctx.app)
    await setLocation(ctx.app, token, -23.561414, -46.655881)
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.latitude).toBe(-23.56)
    expect(stored.longitude).toBe(-46.66)
  })

  it('perfil público não expõe e-mail, data de nascimento nem coordenadas', async () => {
    const viewer = await registerOwner(ctx.app)
    const other = await registerOwner(ctx.app)
    await setLocation(ctx.app, other.token, -23.56, -46.65)
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/users/${other.user.id}`,
      headers: auth(viewer.token),
    })
    expect(response.statusCode).toBe(200)
    const body = response.body
    expect(body).not.toContain(other.user.email)
    expect(body).not.toMatch(/latitude|longitude|birthDate|-23\.56/)
    expect(response.json().user.age).toBeGreaterThanOrEqual(18)
  })

  it('revogar consentimento apaga a localização', async () => {
    const { token, user } = await registerOwner(ctx.app)
    await setLocation(ctx.app, token, -23.56, -46.65)
    const response = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/v1/me/location',
      headers: auth(token),
    })
    expect(response.json<Me>().hasLocation).toBe(false)
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    expect([stored.latitude, stored.consentLocationAt]).toEqual([null, null])
  })

  it('exporta os próprios dados', async () => {
    const { token, user } = await registerOwner(ctx.app)
    await createPet(ctx.app, token, { name: 'Thor' })
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/export',
      headers: auth(token),
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('attachment')
    const data = response.json()
    expect(data.account.email).toBe(user.email)
    expect(data.pets[0].name).toBe('Thor')
    expect(JSON.stringify(data)).not.toContain('passwordHash')
  })

  it('exclui a conta de verdade, incluindo arquivos, mediante senha', async () => {
    const { token, user } = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, token)
    const upload = await imageMultipart()
    const withPhoto = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/photos`,
      headers: { ...auth(token), ...upload.headers },
      payload: upload.payload,
    })
    const photoKey = (withPhoto.json().photos[0].url as string).replace('/api/v1/files/', '')
    expect(existsSync(storage.resolveKey(photoKey) as string)).toBe(true)

    const wrong = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: auth(token),
      payload: { password: 'errada' },
    })
    expect(wrong.statusCode).toBe(403)

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: auth(token),
      payload: { password: 'senha-segura-123' },
    })
    expect(deleted.statusCode).toBe(204)
    expect(await db.user.count({ where: { id: user.id } })).toBe(0)
    expect(await db.pet.count({ where: { ownerId: user.id } })).toBe(0)
    expect(existsSync(storage.resolveKey(photoKey) as string)).toBe(false)
  })
})
