import { randomUUID } from 'node:crypto'
import type { Env } from '../env'
import { LocalStorageProvider } from './local'
import { S3StorageProvider } from './s3'
import { SupabaseStorageProvider } from './supabase'

/**
 * Abstração do armazenamento de arquivos. O banco guarda só a chave;
 * trocar de provedor é questão de variável de ambiente (STORAGE_DRIVER).
 */
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  delete(keys: string[]): Promise<void>
  publicUrl(key: string): string
}

export function createStorage(env: Env): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case 'supabase':
      return new SupabaseStorageProvider({
        url: env.SUPABASE_URL as string,
        serviceKey: env.SUPABASE_SERVICE_KEY as string,
        bucket: env.SUPABASE_BUCKET,
      })
    case 's3':
      return new S3StorageProvider({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
        publicUrl: env.S3_PUBLIC_URL as string,
      })
    case 'local':
      return new LocalStorageProvider(env.STORAGE_LOCAL_DIR)
  }
}

/** Gera chave aleatória (não expõe nome original do arquivo). */
export function newStorageKey(folder: string, extension: string): string {
  return `${folder}/${randomUUID()}.${extension}`
}
