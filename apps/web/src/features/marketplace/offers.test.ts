import type { Promotion } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { formatCountdown, isFlash } from './offers'

describe('contagem regressiva das ofertas', () => {
  it('mostra horas:minutos:segundos no último dia e dias depois disso', () => {
    expect(formatCountdown((2 * 3600 + 5 * 60 + 9) * 1000)).toBe('02:05:09')
    expect(formatCountdown(26 * 3_600_000)).toBe('1 dia')
    expect(formatCountdown(3 * 86_400_000)).toBe('3 dias')
    expect(formatCountdown(0)).toBe('encerrada')
  })

  it('oferta que acaba em até 12 h é relâmpago', () => {
    const now = Date.parse('2026-10-17T12:00:00Z')
    const offer = (hours: number) =>
      ({ endsAt: new Date(now + hours * 3_600_000).toISOString() }) as Promotion
    expect(isFlash(offer(5), now)).toBe(true)
    expect(isFlash(offer(30), now)).toBe(false)
  })
})
