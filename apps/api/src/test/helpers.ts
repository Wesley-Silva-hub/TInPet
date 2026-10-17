import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AuthResponse, Pet, PetInput } from '@tinpet/shared'
import sharp from 'sharp'
import { afterAll, beforeEach } from 'vitest'
import { type App, buildApp } from '../app'
import { loadEnv } from '../shared/env'
import { createPrisma } from '../shared/prisma'
import { LocalStorageProvider } from '../shared/storage/local'

const env = loadEnv()
export const db = createPrisma(env.DATABASE_URL)
export const storage = new LocalStorageProvider(mkdtempSync(join(tmpdir(), 'tinpet-test-')))

/** App novo por arquivo de teste e banco limpo antes de cada teste. */
export function setupTestApp() {
  const context = { app: undefined as unknown as App }

  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE users, pets, swipes, matches, messages, products, refresh_tokens, blocks, reports, breeds, posts, post_likes, post_comments, articles, pet_vaccines, notifications RESTART IDENTITY CASCADE',
    )
    await db.breed.createMany({
      data: [
        { species: 'DOG', name: 'Labrador' },
        { species: 'CAT', name: 'Siamês' },
      ],
    })
    context.app ??= await buildApp({ env, db, storage })
  })

  afterAll(async () => {
    await context.app?.close()
  })

  return context
}

let sequence = 0

export async function registerOwner(
  app: App,
  overrides: Partial<{ name: string; role: 'OWNER' | 'COMPANY' }> = {},
) {
  sequence++
  const role = overrides.role ?? 'OWNER'
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    // IP distinto por cadastro: o rate limit de auth continua ativo nos testes
    remoteAddress: `10.0.${Math.floor(sequence / 250)}.${sequence % 250}`,
    payload: {
      name: overrides.name ?? `Pessoa ${sequence}`,
      email: `pessoa${sequence}-${Date.now()}@teste.dev`,
      password: 'senha-segura-123',
      birthDate: '1990-05-10',
      role,
      acceptTerms: true,
      acceptLocation: true,
      ...(role === 'COMPANY' && {
        company: { tradeName: `Loja ${sequence}`, cnpj: String(sequence).padStart(14, '1') },
      }),
    },
  })
  if (response.statusCode !== 201) throw new Error(`register falhou: ${response.body}`)
  const body = response.json<AuthResponse>()
  const cookie = response.cookies.find((item) => item.name === 'tinpet_rt')?.value as string
  return { token: body.accessToken, user: body.user, refreshCookie: cookie }
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` })

export async function setLocation(app: App, token: string, latitude: number, longitude: number) {
  const response = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/location',
    headers: auth(token),
    payload: { latitude, longitude },
  })
  if (response.statusCode !== 200) throw new Error(`location falhou: ${response.body}`)
}

export async function createPet(app: App, token: string, input: Partial<PetInput> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/pets',
    headers: auth(token),
    payload: {
      name: 'Pet',
      species: 'DOG',
      breedId: null,
      sex: 'MALE',
      size: 'MEDIUM',
      birthDate: null,
      bio: '',
      purpose: 'FRIENDSHIP',
      ...input,
    },
  })
  if (response.statusCode !== 201) throw new Error(`createPet falhou: ${response.body}`)
  return response.json<Pet>()
}

/** Monta um corpo multipart/form-data com uma imagem. */
export async function imageMultipart(options: { withGps?: boolean } = {}) {
  let image = sharp({
    create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 100, b: 50 } },
  }).jpeg()
  if (options.withGps) {
    image = image.withExif({ IFD0: { Copyright: 'teste', ImageDescription: 'GPS -23.5,-46.6' } })
  }
  const buffer = await image.toBuffer()
  const boundary = '----tinpet-test-boundary'
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}
