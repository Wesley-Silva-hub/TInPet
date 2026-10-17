import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupabaseStorageProvider } from './supabase'

afterEach(() => vi.unstubAllGlobals())

function mockFetch(status = 200) {
  const fetchMock = vi.fn(
    async (_url: string, _init: RequestInit) => new Response('{}', { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const provider = (serviceKey: string) =>
  new SupabaseStorageProvider({ url: 'https://abc.supabase.co/', serviceKey, bucket: 'tinpet' })

describe('SupabaseStorageProvider', () => {
  it('envia a secret key nova só no header apikey', async () => {
    const fetchMock = mockFetch()
    await provider('sb_secret_123').put('pets/x.webp', Buffer.from('img'), 'image/webp')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/tinpet/pets/x.webp')
    expect(init.headers).toMatchObject({ apikey: 'sb_secret_123', 'content-type': 'image/webp' })
    expect(init.headers).not.toHaveProperty('authorization')
  })

  it('chave legada (JWT) também vai no Authorization', async () => {
    const fetchMock = mockFetch()
    await provider('eyJhbGciOi.legacy').delete(['a.webp'])
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({ authorization: 'Bearer eyJhbGciOi.legacy' })
    expect(JSON.parse(init.body as string)).toEqual({ prefixes: ['a.webp'] })
  })

  it('falha alto quando o Supabase recusa o upload', async () => {
    mockFetch(403)
    await expect(provider('sb_secret_x').put('k', Buffer.from(''), 'image/webp')).rejects.toThrow(
      /403/,
    )
  })

  it('monta a URL pública do bucket', () => {
    expect(provider('k').publicUrl('pets/x.webp')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/tinpet/pets/x.webp',
    )
  })
})
