import { describe, expect, it } from 'vitest'
import { eventWhen } from './queries'

describe('data do evento', () => {
  it('no mesmo dia mostra só a hora do fim', () => {
    const text = eventWhen({ startsAt: '2026-11-21T19:00:00Z', endsAt: '2026-11-21T21:00:00Z' })
    expect(text).toMatch(/–/)
    expect(text.split('–')[1]?.trim()).toMatch(/^\d{2}:\d{2}$/)
  })

  it('sem fim mostra só o início', () => {
    expect(eventWhen({ startsAt: '2026-11-21T19:00:00Z', endsAt: null })).not.toMatch(/–/)
  })
})
