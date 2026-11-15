import { breedHealthFor, species } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { breeds } from '../../prisma/seed-data'

describe('saúde da raça', () => {
  it('toda raça do catálogo tem orientação (menos a espécie Outro)', () => {
    for (const kind of species) {
      for (const breed of breeds[kind]) {
        const health = breedHealthFor(kind, breed)
        if (kind === 'OTHER') expect(health).toBeNull()
        else expect(health?.care, `${kind} / ${breed}`).toBeTruthy()
      }
    }
  })

  it('raça conhecida traz o que observar; sem raça cai no cuidado geral', () => {
    expect(breedHealthFor('DOG', 'Pug')?.watch.join(' ')).toMatch(/braquicefálica/)
    expect(breedHealthFor('DOG', null)?.watch).toEqual([])
    expect(breedHealthFor('CAT', 'Frajola')?.care).toMatch(/check-up/)
    expect(breedHealthFor('RABBIT', 'Mini Lop')?.watch.join(' ')).toMatch(/Otite/)
  })
})
