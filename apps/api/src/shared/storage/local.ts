import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { StorageProvider } from './storage'

export const LOCAL_FILES_ROUTE = '/api/v1/files'

/** Disco local, para desenvolvimento sem nenhum serviço externo. Arquivos servidos pela própria API. */
export class LocalStorageProvider implements StorageProvider {
  readonly root: string

  constructor(directory: string) {
    this.root = resolve(directory)
  }

  /** Resolve a chave dentro da pasta raiz, bloqueando path traversal. */
  resolveKey(key: string): string | null {
    const path = resolve(this.root, key)
    return path.startsWith(this.root + sep) ? path : null
  }

  async put(key: string, body: Buffer) {
    const path = this.resolveKey(key)
    if (!path) throw new Error('Chave de arquivo inválida')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
  }

  async delete(keys: string[]) {
    await Promise.all(
      keys.map((key) => {
        const path = this.resolveKey(key)
        return path ? rm(path, { force: true }) : undefined
      }),
    )
  }

  publicUrl(key: string) {
    return `${LOCAL_FILES_ROUTE}/${key}`
  }
}
