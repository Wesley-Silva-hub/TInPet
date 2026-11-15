import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

/** TOTP (RFC 6238): códigos de 6 dígitos que mudam a cada 30 s, como no Google Authenticator. */
export const TOTP_STEP_SECONDS = 30
const DIGITS = 6
/** Aceita o código anterior e o próximo (relógio do celular um pouco fora). */
const WINDOW = 1
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) throw new Error('base32 inválido')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Segredo novo de 160 bits (o tamanho recomendado pela RFC 4226), em base32. */
export const newTotpSecret = () => base32Encode(randomBytes(20))

export const stepAt = (time: number) => Math.floor(time / 1000 / TOTP_STEP_SECONDS)

/** Código HOTP (RFC 4226) de um passo. */
export function codeAt(secret: Buffer, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac('sha1', secret).update(counter).digest()
  const offset = (hmac[hmac.length - 1] as number) & 0x0f
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** digits).padStart(digits, '0')
}

/**
 * Confere o código e devolve o passo que bateu. Recusa passos já usados (`lastStep`), então o
 * mesmo código não serve duas vezes mesmo dentro dos 30 s.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastStep: number | null,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const secret = base32Decode(secretBase32)
  const current = stepAt(now)
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const step = current + delta
    if (lastStep !== null && step <= lastStep) continue
    const expected = Buffer.from(codeAt(secret, step))
    if (timingSafeEqual(expected, Buffer.from(code))) return step
  }
  return null
}

/** Endereço que o app autenticador lê no QR code. */
export function otpauthUrl(secret: string, account: string, issuer = 'TinPet') {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(TOTP_STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params}`
}

/**
 * Cifra o segredo no banco (AES-256-GCM) com chave derivada do JWT_SECRET: um vazamento só do
 * banco não entrega os segredos. Trocar o JWT_SECRET invalida o 2FA de todos (documentado).
 */
export class SecretBox {
  private readonly key: Buffer

  constructor(secret: string) {
    this.key = Buffer.from(hkdfSync('sha256', secret, 'tinpet', 'totp-secret-v1', 32))
  }

  seal(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return ['v1', iv, cipher.getAuthTag(), data]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.')
  }

  open(sealed: string): string {
    const [version, iv, tag, data] = sealed.split('.')
    if (version !== 'v1' || !iv || !tag || !data) throw new Error('segredo em formato inválido')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  }
}

/** Códigos de recuperação legíveis: XXXXX-XXXXX, sem letras que confundem. */
export function newRecoveryCodes(count = 8): string[] {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10)
    const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
    return `${chars.slice(0, 5)}-${chars.slice(5)}`
  })
}

/** Normaliza o que a pessoa digitou (minúsculas, espaços) antes do hash. */
export const normalizeRecoveryCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^(.{5})(.{5})$/, '$1-$2')
