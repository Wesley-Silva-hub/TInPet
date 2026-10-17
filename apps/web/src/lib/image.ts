/**
 * Redimensiona e recomprime no navegador antes do upload: economiza dados móveis e,
 * ao redesenhar no canvas, descarta metadados EXIF (incluindo GPS).
 * A API reprocessa de novo — nunca confiamos só no cliente.
 */
export async function compressImage(file: File, maxSide = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponível')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))),
      'image/jpeg',
      quality,
    ),
  )
}

export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp'
