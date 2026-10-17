import { describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, reloadForNewVersion } from './versionReload'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

describe('versão desatualizada do site', () => {
  it('reconhece erros de carregamento de chunk de vários navegadores', () => {
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js')),
    ).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new Error('Falha ao buscar o módulo importado dinamicamente'))).toBe(
      true,
    )
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })

  it('recarrega uma vez e não entra em loop se o erro se repetir', () => {
    const storage = memoryStorage()
    const reload = vi.fn()
    expect(reloadForNewVersion(storage, reload)).toBe(true)
    expect(reloadForNewVersion(storage, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('volta a recarregar num deploy futuro, depois da janela de proteção', () => {
    const storage = memoryStorage()
    const reload = vi.fn()
    storage.setItem('tinpet:recarregou-versao', String(Date.now() - 60_000))
    expect(reloadForNewVersion(storage, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
