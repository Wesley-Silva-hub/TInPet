import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StorageProvider } from './storage'

interface S3StorageOptions {
  endpoint: string | undefined
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}

/** Qualquer storage compatível com S3: RustFS/MinIO na VPS, AWS S3, Cloudflare R2... */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      // Necessário para servidores self-hosted (bucket no caminho, não no subdomínio)
      forcePathStyle: Boolean(options.endpoint),
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    })
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
      }),
    )
  }

  async delete(keys: string[]) {
    if (keys.length === 0) return
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.options.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    )
  }

  publicUrl(key: string) {
    return `${this.options.publicUrl.replace(/\/$/, '')}/${key}`
  }
}
