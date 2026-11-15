import type { TimelineItem } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { groupByMonth } from './PetTimeline'

const item = (id: string, date: string): TimelineItem => ({
  id,
  kind: 'POST',
  date,
  title: '',
  detail: '',
  imageUrl: null,
  to: null,
})

describe('linha do tempo', () => {
  it('agrupa por mês mantendo a ordem, sem trocar o mês por causa do fuso', () => {
    const groups = groupByMonth([
      item('a', '2024-07-15T10:00:00.000Z'),
      item('b', '2024-07-01T00:00:00.000Z'),
      item('c', '2024-06-01T00:00:00.000Z'),
    ])
    expect(groups.map((group) => [group.title, group.items.map((entry) => entry.id)])).toEqual([
      ['julho de 2024', ['a', 'b']],
      ['junho de 2024', ['c']],
    ])
  })
})
