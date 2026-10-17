import type { MultipartFile } from '@fastify/multipart'
import sharp from 'sharp'
import { badRequest } from './errors'

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp'])

/**
 * Valida pelo conteúdo real (não pelo MIME declarado), corrige orientação,
 * redimensiona e reconverte para WebP. A reconversão descarta todos os
 * metadados (EXIF, incluindo GPS).
 */
export async function processImage(input: Buffer, maxSide = 1280): Promise<Buffer> {
  let format: string | undefined
  try {
    format = (await sharp(input).metadata()).format
  } catch {
    throw badRequest('INVALID_IMAGE', 'Arquivo não é uma imagem válida')
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw badRequest('INVALID_IMAGE', 'Envie uma imagem JPEG, PNG ou WebP')
  }
  return sharp(input)
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}

/** Lê o arquivo do multipart respeitando o limite de tamanho. */
export async function readUpload(file: MultipartFile | undefined): Promise<Buffer> {
  if (!file) throw badRequest('FILE_REQUIRED', 'Envie um arquivo no campo "file"')
  const buffer = await file.toBuffer()
  if (file.file.truncated) {
    throw badRequest('FILE_TOO_LARGE', `Arquivo maior que ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`)
  }
  return buffer
}
