import { readFile } from 'node:fs/promises'
import type { Pet } from '@tinpet/shared'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  auth,
  createPet,
  imageMultipart,
  registerOwner,
  setupTestApp,
  storage,
} from '../../test/helpers'

const ctx = setupTestApp()

describe('pets', () => {
  it('só o dono edita ou exclui o próprio pet', async () => {
    const owner = await registerOwner(ctx.app)
    const other = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token, { name: 'Thor' })

    const patch = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/pets/${pet.id}`,
      headers: auth(other.token),
      payload: { name: 'Invasor' },
    })
    expect(patch.statusCode).toBe(403)
    const remove = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/pets/${pet.id}`,
      headers: auth(other.token),
    })
    expect(remove.statusCode).toBe(403)

    const ok = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/pets/${pet.id}`,
      headers: auth(owner.token),
      payload: { name: 'Thor II' },
    })
    expect(ok.json<Pet>().name).toBe('Thor II')
    expect(ok.json<Pet>().bio).toBe('')
  })

  it('empresa não cadastra pet e raça precisa ser da mesma espécie', async () => {
    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    await expect(createPet(ctx.app, company.token)).rejects.toThrow(/403|FORBIDDEN|Apenas/)

    const owner = await registerOwner(ctx.app)
    const catBreed = 2 // Siamês (helpers)
    await expect(
      createPet(ctx.app, owner.token, { species: 'DOG', breedId: catBreed }),
    ).rejects.toThrow(/INVALID_BREED/)
  })

  it('foto enviada é reconvertida para WebP sem metadados EXIF', async () => {
    const owner = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    const response = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/photos`,
      headers: { ...auth(owner.token), ...(await imageMultipart({ withGps: true })).headers },
      payload: (await imageMultipart({ withGps: true })).payload,
    })
    expect(response.statusCode).toBe(201)
    const url = response.json<Pet>().photos[0]?.url as string
    const key = url.replace('/api/v1/files/', '')
    const file = await readFile(storage.resolveKey(key) as string)
    const metadata = await sharp(file).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.exif).toBeUndefined()
  })

  it('rejeita arquivo que não é imagem mesmo com MIME de imagem', async () => {
    const owner = await registerOwner(ctx.app)
    const pet = await createPet(ctx.app, owner.token)
    const boundary = 'b'
    const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.jpg"\r\nContent-Type: image/jpeg\r\n\r\nnao sou imagem\r\n--${boundary}--\r\n`
    const response = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/pets/${pet.id}/photos`,
      headers: {
        ...auth(owner.token),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_IMAGE')
  })
})
