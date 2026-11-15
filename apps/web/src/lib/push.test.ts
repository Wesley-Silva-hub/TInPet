import { describe, expect, it } from 'vitest'
import { urlBase64ToBytes } from './push'

describe('chave VAPID', () => {
  it('converte base64url (sem padding) para bytes', () => {
    // "TinPet!" em base64url é "VGluUGV0IQ"
    expect([...urlBase64ToBytes('VGluUGV0IQ')]).toEqual([...new TextEncoder().encode('TinPet!')])
  })

  it('aceita - e _ do base64url', () => {
    expect([...urlBase64ToBytes('-_8')]).toEqual([0xfb, 0xff])
  })
})
