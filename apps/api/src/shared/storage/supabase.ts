import type { StorageProvider } from './storage'

interface SupabaseStorageOptions {
  url: string
  serviceKey: string
  bucket: string
}

/**
 * Supabase Storage via API REST (sem supabase-js). O bucket deve ser público
 * para leitura; escrita só com a chave de serviço, que nunca sai da API.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private readonly baseUrl: string

  constructor(private readonly options: SupabaseStorageOptions) {
    this.baseUrl = `${options.url.replace(/\/$/, '')}/storage/v1`
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.options.serviceKey,
      authorization: `Bearer ${this.options.serviceKey}`,
      ...extra,
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    const response = await fetch(`${this.baseUrl}/object/${this.options.bucket}/${key}`, {
      method: 'POST',
      headers: this.headers({ 'content-type': contentType, 'cache-control': 'max-age=31536000' }),
      body: new Uint8Array(body),
    })
    if (!response.ok) {
      throw new Error(`Supabase Storage respondeu ${response.status} ao enviar arquivo`)
    }
  }

  async delete(keys: string[]) {
    if (keys.length === 0) return
    const response = await fetch(`${this.baseUrl}/object/${this.options.bucket}`, {
      method: 'DELETE',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ prefixes: keys }),
    })
    if (!response.ok) {
      throw new Error(`Supabase Storage respondeu ${response.status} ao remover arquivos`)
    }
  }

  publicUrl(key: string) {
    return `${this.baseUrl}/object/public/${this.options.bucket}/${key}`
  }
}
