import type { Page, Product } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

const product = {
  title: 'Ração Premium 15 kg',
  description: 'Sabor frango',
  priceCents: 24990,
  category: 'FOOD',
  externalLink: 'https://example.com/racao',
  isActive: true,
}

const create = (token: string, payload: object = product) =>
  ctx.app.inject({ method: 'POST', url: '/api/v1/products', headers: auth(token), payload })

describe('marketplace', () => {
  it('só empresas anunciam e só a dona edita o produto', async () => {
    const owner = await registerOwner(ctx.app)
    expect((await create(owner.token)).statusCode).toBe(403)

    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    const rival = await registerOwner(ctx.app, { role: 'COMPANY' })
    const created = await create(company.token)
    expect(created.statusCode).toBe(201)
    const id = created.json<Product>().id

    const hijack = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${id}`,
      headers: auth(rival.token),
      payload: { priceCents: 1 },
    })
    expect(hijack.statusCode).toBe(403)

    const partial = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${id}`,
      headers: auth(company.token),
      payload: { priceCents: 19990 },
    })
    expect(partial.json<Product>()).toMatchObject({
      priceCents: 19990,
      isActive: true,
      description: 'Sabor frango',
    })
  })

  it('preço precisa ser inteiro em centavos', async () => {
    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    expect((await create(company.token, { ...product, priceCents: 249.9 })).statusCode).toBe(400)
  })

  it('vitrine pública busca, filtra e esconde inativos', async () => {
    const company = await registerOwner(ctx.app, { role: 'COMPANY' })
    await create(company.token)
    await create(company.token, {
      ...product,
      title: 'Bolinha de borracha',
      category: 'TOYS',
      priceCents: 1500,
    })
    await create(company.token, { ...product, title: 'Ração antiga', isActive: false })

    const list = async (query: string) =>
      (await ctx.app.inject({ method: 'GET', url: `/api/v1/products${query}` })).json<
        Page<Product>
      >()

    expect((await list('')).items).toHaveLength(2)
    expect((await list('?q=ração')).items.map((p) => p.title)).toEqual(['Ração Premium 15 kg'])
    expect((await list('?category=TOYS')).items.map((p) => p.title)).toEqual([
      'Bolinha de borracha',
    ])
    expect((await list('?maxPriceCents=2000')).items).toHaveLength(1)
    const firstPage = await list('?limit=1')
    const secondPage = await list(`?limit=1&cursor=${firstPage.nextCursor}`)
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)
  })
})
