import { describe, expect, it } from 'vitest'
import { timeAgo } from './time'

describe('timeAgo', () => {
  const now = new Date('2026-10-17T12:00:00Z').getTime()
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()

  it('usa "agora", minutos, horas e dias na última semana', () => {
    expect(timeAgo(ago(20), now)).toBe('agora')
    expect(timeAgo(ago(5 * 60), now)).toMatch(/5 min/)
    expect(timeAgo(ago(3 * 3600), now)).toMatch(/3 h/)
    expect(timeAgo(ago(24 * 3600), now)).toBe('ontem')
  })

  it('mostra a data depois de uma semana', () => {
    expect(timeAgo(ago(10 * 24 * 3600), now)).toMatch(/7 de out/)
  })
})
