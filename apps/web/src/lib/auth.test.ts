import type { Me } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { homePathFor } from './auth'

const as = (role: Me['role']) => ({ role }) as Me

describe('página inicial por papel', () => {
  it('cada papel cai numa rota que ele pode abrir (sem loop de redirecionamento)', () => {
    expect(homePathFor(as('OWNER'))).toBe('/inicio')
    expect(homePathFor(as('COMPANY'))).toBe('/empresa')
    expect(homePathFor(as('ADMIN'))).toBe('/moderacao')
  })
})
