import { extractHashtags, splitHashtags } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'

describe('hashtags na legenda', () => {
  it('extrai em minúsculas, com acento, sem repetir', () => {
    expect(extractHashtags('Olá #Caminhada no #parque, #caminhada de novo! #Ração_boa #a')).toEqual(
      ['caminhada', 'parque', 'ração_boa'],
    )
  })

  it('divide o texto preservando a pontuação ao redor das tags', () => {
    expect(splitHashtags('Bom dia #Sol!')).toEqual([
      { start: 0, text: 'Bom dia ' },
      { start: 8, text: '#Sol', tag: 'sol' },
      { start: 12, text: '!' },
    ])
  })
})
