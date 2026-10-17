import { formatPrice } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { parsePriceToCents } from './ProductFormPage'

describe('preço', () => {
  it('converte reais digitados para centavos inteiros', () => {
    expect(parsePriceToCents('249,90')).toBe(24990)
    expect(parsePriceToCents('1.249,90')).toBe(124990)
    expect(parsePriceToCents('R$ 19')).toBe(1900)
    expect(parsePriceToCents('0,1')).toBe(10)
    expect(parsePriceToCents('')).toBeNaN()
  })

  it('formata centavos em reais', () => {
    expect(formatPrice(124990).replace(/\s/g, ' ')).toBe('R$ 1.249,90')
  })
})
