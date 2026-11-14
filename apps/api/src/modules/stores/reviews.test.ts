import type { StoreReviews, StoreSummary } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const review = (token: string, storeId: string, rating: number, comment = '') =>
  ctx.app.inject({
    method: 'PUT',
    url: `/api/v1/stores/${storeId}/reviews/mine`,
    headers: auth(token),
    payload: { rating, comment },
  })

describe('avaliações de lojas', () => {
  it('tutores avaliam uma vez por loja e a média aparece na loja', async () => {
    const store = await registerOwner(ctx.app, { role: 'COMPANY' })
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)

    expect((await review(ana.token, store.user.id, 5, 'Atendimento ótimo')).statusCode).toBe(200)
    await review(bia.token, store.user.id, 2)
    // Avaliar de novo substitui a anterior (não conta duas vezes)
    const updated = await review(bia.token, store.user.id, 4, 'Melhorou')
    const body = updated.json<StoreReviews>()
    expect(body.summary).toEqual({ average: 4.5, count: 2 })
    expect(body.mine).toMatchObject({ rating: 4, comment: 'Melhorou', isMine: true })
    expect(body.items).toHaveLength(2)
    expect(updated.body).not.toContain(ana.user.email)

    const detail = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/stores/${store.user.id}`,
      headers: auth(ana.token),
    })
    expect(detail.json<StoreSummary>().rating).toEqual({ average: 4.5, count: 2 })
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/stores',
      headers: auth(ana.token),
    })
    expect(list.json<StoreSummary[]>()[0]?.rating.count).toBe(2)
  })

  it('apaga a própria avaliação', async () => {
    const store = await registerOwner(ctx.app, { role: 'COMPANY' })
    const ana = await registerOwner(ctx.app)
    await review(ana.token, store.user.id, 3)
    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/stores/${store.user.id}/reviews/mine`,
      headers: auth(ana.token),
    })
    expect(removed.json<StoreReviews>()).toMatchObject({
      summary: { average: null, count: 0 },
      mine: null,
      items: [],
    })
  })

  it('só tutores avaliam, só lojas recebem avaliação e a nota vai de 1 a 5', async () => {
    const store = await registerOwner(ctx.app, { role: 'COMPANY' })
    const otherStore = await registerOwner(ctx.app, { role: 'COMPANY' })
    const ana = await registerOwner(ctx.app)
    const bia = await registerOwner(ctx.app)

    expect((await review(otherStore.token, store.user.id, 5)).statusCode).toBe(403)
    expect((await review(ana.token, bia.user.id, 5)).statusCode).toBe(404)
    expect((await review(ana.token, store.user.id, 0)).statusCode).toBe(400)
    expect((await review(ana.token, store.user.id, 6)).statusCode).toBe(400)
    expect((await review(ana.token, store.user.id, 4.5)).statusCode).toBe(400)
  })
})
