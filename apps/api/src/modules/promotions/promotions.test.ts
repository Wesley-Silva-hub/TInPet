import type {
  MyPromotion,
  Product,
  Promotion,
  RecommendedProduct,
  StoreSummary,
} from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { auth, createPet, db, registerOwner, setLocation, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

async function createProduct(token: string, payload: Record<string, unknown> = {}) {
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/products',
    headers: auth(token),
    payload: {
      title: 'Ração Premium',
      description: '',
      priceCents: 10000,
      category: 'FOOD',
      externalLink: null,
      isActive: true,
      ...payload,
    },
  })
  if (response.statusCode !== 201) throw new Error(response.body)
  return response.json<Product>()
}

async function promote(token: string, productId: string, payload: Record<string, unknown> = {}) {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/v1/promotions',
    headers: auth(token),
    payload: {
      productId,
      headline: 'Oferta de inauguração',
      discountPercent: 20,
      couponCode: 'tinpet20',
      species: [],
      radiusKm: 10,
      durationHours: 24,
      ...payload,
    },
  })
}

const forYou = async (token: string) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/v1/promotions/for-you', headers: auth(token) })
  ).json<Promotion[]>()

describe('impulsionar', () => {
  it('a loja impulsiona o próprio produto; cupom fica em maiúsculas e o preço final é calculado', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    const product = await createProduct(shop.token)
    const response = await promote(shop.token, product.id)
    expect(response.statusCode).toBe(201)
    expect(response.json<MyPromotion>()).toMatchObject({
      couponCode: 'TINPET20',
      finalPriceCents: 8000,
      status: 'ACTIVE',
      impressions: 0,
    })
  })

  it('não deixa impulsionar produto de outra loja, nem tutor criar anúncio', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    const rival = await registerOwner(ctx.app, { role: 'COMPANY' })
    const owner = await registerOwner(ctx.app)
    const product = await createProduct(shop.token)
    expect((await promote(rival.token, product.id)).json().error.code).toBe('INVALID_PRODUCT')
    expect((await promote(owner.token, product.id)).statusCode).toBe(403)
  })

  it('mostra só para quem tem a espécie certa e está dentro do raio', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    await setLocation(ctx.app, shop.token, -23.56, -46.65)
    const product = await createProduct(shop.token)
    await promote(shop.token, product.id, { species: ['DOG'], radiusKm: 5 })

    const dogNear = await registerOwner(ctx.app)
    await setLocation(ctx.app, dogNear.token, -23.57, -46.65)
    await createPet(ctx.app, dogNear.token, { species: 'DOG' })

    const catNear = await registerOwner(ctx.app)
    await setLocation(ctx.app, catNear.token, -23.57, -46.65)
    await createPet(ctx.app, catNear.token, { species: 'CAT' })

    const dogFar = await registerOwner(ctx.app)
    await setLocation(ctx.app, dogFar.token, -22.9, -47.06)
    await createPet(ctx.app, dogFar.token, { species: 'DOG' })

    const offers = await forYou(dogNear.token)
    expect(offers.map((offer) => offer.headline)).toEqual(['Oferta de inauguração'])
    expect(offers[0]?.hasCoupon).toBe(true)
    expect(JSON.stringify(offers)).not.toContain('TINPET20')
    expect(offers[0]?.product.distanceKm).toBeLessThanOrEqual(2)
    expect(await forYou(catNear.token)).toEqual([])
    expect(await forYou(dogFar.token)).toEqual([])
  })

  it('anúncio pausado ou encerrado sai do ar', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    const owner = await registerOwner(ctx.app)
    const product = await createProduct(shop.token)
    const promotion = (await promote(shop.token, product.id)).json<MyPromotion>()
    expect(await forYou(owner.token)).toHaveLength(1)

    const paused = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/promotions/${promotion.id}`,
      headers: auth(shop.token),
      payload: { paused: true },
    })
    expect(paused.json<MyPromotion>().status).toBe('PAUSED')
    expect(await forYou(owner.token)).toHaveLength(0)

    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/promotions/${promotion.id}`,
      headers: auth(shop.token),
      payload: { paused: false },
    })
    await db.promotion.update({
      where: { id: promotion.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    })
    expect(await forYou(owner.token)).toHaveLength(0)
  })

  it('métricas honestas: visualização única por dia, cliques, cupons, e a loja não conta', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    const ana = await registerOwner(ctx.app)
    const bruno = await registerOwner(ctx.app)
    const product = await createProduct(shop.token)
    const promotion = (await promote(shop.token, product.id)).json<MyPromotion>()
    const event = (token: string, type: 'view' | 'click') =>
      ctx.app.inject({
        method: 'POST',
        url: `/api/v1/promotions/${promotion.id}/events`,
        headers: auth(token),
        payload: { type },
      })

    await event(ana.token, 'view')
    await event(ana.token, 'view')
    await event(bruno.token, 'view')
    await event(shop.token, 'view')
    await event(ana.token, 'click')
    const coupon = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/promotions/${promotion.id}/coupon`,
      headers: auth(ana.token),
    })
    expect(coupon.json()).toEqual({ couponCode: 'TINPET20' })

    const mine = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/promotions/mine',
      headers: auth(shop.token),
    })
    expect(mine.json<MyPromotion[]>()[0]).toMatchObject({
      impressions: 2,
      clicks: 1,
      couponReveals: 1,
    })
  })
})

describe('lojas da região e recomendações', () => {
  it('lista lojas da mais próxima para a mais distante, com produtos ativos', async () => {
    const viewer = await registerOwner(ctx.app)
    await setLocation(ctx.app, viewer.token, -23.56, -46.65)
    const near = await registerOwner(ctx.app, { role: 'COMPANY' })
    const far = await registerOwner(ctx.app, { role: 'COMPANY' })
    await setLocation(ctx.app, near.token, -23.57, -46.65)
    await setLocation(ctx.app, far.token, -23.66, -46.53)
    await createProduct(near.token)
    await createProduct(near.token, { isActive: false })

    const update = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/me/store',
      headers: auth(near.token),
      payload: {
        tradeName: 'Pet Perto',
        kind: 'PETSHOP',
        description: 'Banho, tosa e rações',
        neighborhood: 'Pinheiros',
        address: '',
        phone: '(11) 90000-0000',
        website: null,
        delivers: true,
      },
    })
    expect(update.statusCode).toBe(200)
    expect(
      (
        await ctx.app.inject({
          method: 'PUT',
          url: '/api/v1/me/store',
          headers: auth(viewer.token),
          payload: update.json().company,
        })
      ).statusCode,
    ).toBe(403)

    const stores = (
      await ctx.app.inject({ method: 'GET', url: '/api/v1/stores', headers: auth(viewer.token) })
    ).json<StoreSummary[]>()
    expect(stores.map((store) => store.tradeName)[0]).toBe('Pet Perto')
    expect(stores[0]).toMatchObject({ productCount: 1, delivers: true, neighborhood: 'Pinheiros' })
    expect(stores[0]?.distanceKm).toBeLessThan(stores[1]?.distanceKm ?? 0)
  })

  it('recomenda primeiro o que serve para os pets do tutor e explica o porquê', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    await setLocation(ctx.app, shop.token, -23.56, -46.65)
    await createProduct(shop.token, { title: 'Arranhador', species: ['CAT'] })
    await createProduct(shop.token, { title: 'Bolinha', species: ['DOG'] })
    await createProduct(shop.token, { title: 'Escova universal', species: [] })

    const owner = await registerOwner(ctx.app)
    await setLocation(ctx.app, owner.token, -23.57, -46.65)
    await createPet(ctx.app, owner.token, { name: 'Thor', species: 'DOG' })

    const list = (
      await ctx.app.inject({
        method: 'GET',
        url: '/api/v1/products/recommended',
        headers: auth(owner.token),
      })
    ).json<RecommendedProduct[]>()
    expect(list.map((item) => item.title)).toEqual(['Bolinha', 'Escova universal'])
    expect(list[0]?.reasons).toEqual(expect.arrayContaining(['Para cães como Thor']))
    expect(list[0]?.reasons.some((reason) => /km de você/.test(reason))).toBe(true)
  })

  it('vitrine filtra por espécie (incluindo produtos para todas) e ordena por preço', async () => {
    const shop = await registerOwner(ctx.app, { role: 'COMPANY' })
    await createProduct(shop.token, { title: 'Caro', priceCents: 9000, species: ['DOG'] })
    await createProduct(shop.token, { title: 'Barato', priceCents: 1000, species: [] })
    await createProduct(shop.token, { title: 'Médio', priceCents: 5000, species: ['DOG'] })
    await createProduct(shop.token, { title: 'Gato', priceCents: 3000, species: ['CAT'] })

    const page = async (query: string) =>
      (await ctx.app.inject({ method: 'GET', url: `/api/v1/products${query}` })).json<{
        items: Product[]
        nextCursor: string | null
      }>()
    const first = await page('?species=DOG&sort=price_asc&limit=2')
    const second = await page(`?species=DOG&sort=price_asc&limit=2&cursor=${first.nextCursor}`)
    expect([...first.items, ...second.items].map((product) => product.title)).toEqual([
      'Barato',
      'Médio',
      'Caro',
    ])
    const desc = await page('?sort=price_desc&limit=1')
    expect(desc.items[0]?.title).toBe('Caro')
  })
})
