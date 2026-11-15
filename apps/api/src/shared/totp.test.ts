import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32Encode,
  codeAt,
  normalizeRecoveryCode,
  SecretBox,
  stepAt,
  verifyTotp,
} from './totp'

// Segredo de teste da RFC 6238 (SHA-1): "12345678901234567890"
const RFC_SECRET = Buffer.from('12345678901234567890')

describe('TOTP (RFC 6238)', () => {
  it('bate com os vetores de teste da RFC', () => {
    expect(codeAt(RFC_SECRET, stepAt(59_000), 8)).toBe('94287082')
    expect(codeAt(RFC_SECRET, stepAt(1_111_111_109_000), 8)).toBe('07081804')
    expect(codeAt(RFC_SECRET, stepAt(20_000_000_000_000), 8)).toBe('65353130')
  })

  it('base32 ida e volta', () => {
    const encoded = base32Encode(RFC_SECRET)
    expect(encoded).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(base32Decode(encoded).equals(RFC_SECRET)).toBe(true)
  })

  it('aceita o código atual e o vizinho, mas não o mesmo passo duas vezes', () => {
    const secret = base32Encode(RFC_SECRET)
    const now = 1_700_000_000_000
    const current = stepAt(now)
    const code = codeAt(RFC_SECRET, current)
    expect(verifyTotp(secret, code, null, now)).toBe(current)
    expect(verifyTotp(secret, code, current, now)).toBeNull()
    expect(verifyTotp(secret, codeAt(RFC_SECRET, current - 1), null, now)).toBe(current - 1)
    expect(verifyTotp(secret, codeAt(RFC_SECRET, current - 3), null, now)).toBeNull()
    expect(verifyTotp(secret, 'abcdef', null, now)).toBeNull()
  })
})

describe('cofre do segredo e códigos de recuperação', () => {
  it('cifra e decifra; outra chave não abre', () => {
    const box = new SecretBox('x'.repeat(40))
    const sealed = box.seal('SEGREDO')
    expect(sealed).not.toContain('SEGREDO')
    expect(box.open(sealed)).toBe('SEGREDO')
    expect(() => new SecretBox('y'.repeat(40)).open(sealed)).toThrow()
  })

  it('normaliza o código digitado', () => {
    expect(normalizeRecoveryCode(' abcde fghjk ')).toBe('ABCDE-FGHJK')
    expect(normalizeRecoveryCode('ABCDE-FGHJK')).toBe('ABCDE-FGHJK')
  })
})
