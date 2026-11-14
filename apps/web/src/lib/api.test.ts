import type { AuthResponse } from '@tinpet/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applySession,
  getAccessToken,
  hasSessionHint,
  REFRESH_RETRY_DELAYS_MS,
  refreshSession,
  setSessionListener,
} from './api'

const session = { accessToken: 'token-novo', user: { id: 'u1' } } as unknown as AuthResponse
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('restaurar a sessão com a API acordando', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const listener = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    setSessionListener(listener)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    listener.mockReset()
  })

  it('tenta de novo enquanto o proxy devolve 502/504 e entra quando a API responde', async () => {
    fetchMock
      .mockResolvedValueOnce(json(504))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json(200, session))

    const result = refreshSession()
    await vi.runAllTimersAsync()

    expect(await result).toEqual(session)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(getAccessToken()).toBe('token-novo')
    expect(hasSessionHint()).toBe(true)
  })

  it('sem sessão válida (401) sai e apaga a marca de sessão', async () => {
    window.localStorage.setItem('tinpet:sessao', '1')
    fetchMock.mockResolvedValueOnce(json(401))

    expect(await refreshSession()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(null)
    expect(hasSessionHint()).toBe(false)
  })

  it('servidor fora do ar libera a tela, mas mantém a marca para a próxima visita', async () => {
    window.localStorage.setItem('tinpet:sessao', '1')
    fetchMock.mockResolvedValue(json(503))

    const result = refreshSession()
    await vi.runAllTimersAsync()

    expect(await result).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(REFRESH_RETRY_DELAYS_MS.length + 1)
    expect(listener).toHaveBeenLastCalledWith(null)
    expect(hasSessionHint()).toBe(true)
  })

  it('um refresh atrasado não derruba o login feito enquanto a API acordava', async () => {
    fetchMock.mockResolvedValueOnce(json(504)).mockResolvedValueOnce(json(401))

    const result = refreshSession()
    applySession(session)
    await vi.runAllTimersAsync()

    expect(await result).toBeNull()
    expect(getAccessToken()).toBe('token-novo')
    expect(listener).toHaveBeenLastCalledWith(session)
    expect(hasSessionHint()).toBe(true)
  })
})
