import {
  ageFrom,
  type Page,
  type Product,
  type productInputSchema,
  type productsQuerySchema,
  type productUpdateSchema,
  type RecommendedProduct,
  type Species,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor, productInclude, toDateOnly, toProduct } from '../../shared/dto'
import { forbidden, notFound } from '../../shared/errors'
import { type Coordinates, distanceKm } from '../../shared/geo'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

const RECOMMENDATIONS = 8
const RECOMMENDATION_POOL = 300
const DAY_MS = 24 * 60 * 60 * 1000

/** Cursor da vitrine: valor da ordenação (data ou preço) + id para desempate. */
interface ProductCursor {
  v: string | number
  id: string
}
const isProductCursor = (value: unknown): value is ProductCursor =>
  typeof value === 'object' &&
  value !== null &&
  (typeof (value as ProductCursor).v === 'number' ||
    (typeof (value as ProductCursor).v === 'string' &&
      !Number.isNaN(Date.parse((value as ProductCursor).v as string)))) &&
  typeof (value as ProductCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as ProductCursor).id)

const speciesPlural: Record<Species, string> = {
  DOG: 'cães',
  CAT: 'gatos',
  BIRD: 'aves',
  RABBIT: 'coelhos',
  RODENT: 'roedores',
  OTHER: 'pets',
}

export function createProductService({ db, storage }: AppDeps) {
  async function ownedProduct(user: AuthUser, productId: string) {
    requireRole(user, 'COMPANY')
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) throw notFound('Produto')
    if (product.companyId !== user.id) throw forbidden('Este produto não é seu')
    return product
  }

  /** Localização de quem está vendo (para mostrar a distância até as lojas). */
  async function locationOf(viewer: AuthUser | null): Promise<Coordinates | null> {
    if (!viewer) return null
    return db.user.findUnique({
      where: { id: viewer.id },
      select: { latitude: true, longitude: true },
    })
  }

  const load = async (id: string) =>
    toProduct(
      await db.product.findUniqueOrThrow({ where: { id }, include: productInclude }),
      storage,
    )

  return {
    /** Vitrine pública: só produtos ativos, com busca, filtros e ordenação por data ou preço. */
    async list(
      viewer: AuthUser | null,
      query: z.output<typeof productsQuerySchema>,
    ): Promise<Page<Product>> {
      const cursor = decodeCursor(query.cursor, isProductCursor)
      const byPrice = query.sort !== 'recent'
      const direction = query.sort === 'price_asc' ? 'gt' : 'lt'
      const field = byPrice ? 'priceCents' : 'createdAt'
      const cursorValue = cursor && (byPrice ? Number(cursor.v) : new Date(String(cursor.v)))

      const and: Prisma.ProductWhereInput[] = []
      if (query.q) {
        and.push({
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
          ],
        })
      }
      if (query.species) {
        // Produtos sem espécie definida servem para todas
        and.push({ OR: [{ species: { has: query.species } }, { species: { isEmpty: true } }] })
      }
      if (cursor && cursorValue !== null) {
        and.push({
          OR: [
            { [field]: { [direction]: cursorValue } },
            { [field]: cursorValue, id: { [direction]: cursor.id } },
          ],
        })
      }

      const order = query.sort === 'price_asc' ? 'asc' : 'desc'
      const rows = await db.product.findMany({
        where: {
          isActive: true,
          category: query.category,
          companyId: query.companyId,
          priceCents: { gte: query.minPriceCents, lte: query.maxPriceCents },
          AND: and,
        },
        include: productInclude,
        orderBy: [{ [field]: order }, { id: order }],
        take: query.limit + 1,
      })
      const location = await locationOf(viewer)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((product) => toProduct(product, storage, location)),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({
                v: byPrice ? last.priceCents : last.createdAt.toISOString(),
                id: last.id,
              })
            : null,
      }
    },

    async get(viewer: AuthUser | null, productId: string) {
      const product = await db.product.findFirst({
        where: { id: productId, isActive: true },
        include: productInclude,
      })
      if (!product) throw notFound('Produto')
      return toProduct(product, storage, await locationOf(viewer))
    },

    /**
     * "Para o seu pet": cruza os pets do tutor (espécie, idade) com os produtos, a distância
     * das lojas, entrega e ofertas ativas. Cada item vem com os motivos em linguagem simples.
     */
    async recommended(user: AuthUser): Promise<RecommendedProduct[]> {
      if (user.role !== 'OWNER') return []
      const [me, pets] = await Promise.all([
        db.user.findUnique({ where: { id: user.id }, select: { latitude: true, longitude: true } }),
        db.pet.findMany({
          where: { ownerId: user.id, isActive: true },
          select: { name: true, species: true, birthDate: true },
        }),
      ])
      const now = new Date()
      const candidates = await db.product.findMany({
        where: {
          isActive: true,
          ...(pets.length > 0 && {
            OR: [
              { species: { hasSome: pets.map((pet) => pet.species) } },
              { species: { isEmpty: true } },
            ],
          }),
        },
        include: {
          ...productInclude,
          promotions: {
            where: { pausedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: RECOMMENDATION_POOL,
      })
      const seniorPet = pets.find((pet) => pet.birthDate && ageFrom(toDateOnly(pet.birthDate)) >= 7)

      return candidates
        .map((product) => {
          let score = 0
          const reasons: string[] = []
          const forPet = pets.find((pet) => product.species.includes(pet.species))
          if (forPet) {
            score += 40
            reasons.push(`Para ${speciesPlural[forPet.species]} como ${forPet.name}`)
          } else {
            score += 10
          }
          const km = distanceKm(me, product.company)
          if (km !== null) {
            if (km <= 5) score += 30
            else if (km <= 15) score += 18
            else if (km <= 40) score += 6
            if (km <= 15) reasons.push(`A ${km} km de você`)
          }
          if (product.promotions.length > 0) {
            score += 15
            reasons.push('Em oferta')
          }
          if (product.company.company?.delivers) {
            score += 8
            reasons.push('Faz entrega')
          }
          const text = `${product.title} ${product.description}`.toLowerCase()
          if (seniorPet && /idos|s[êe]nior/.test(text)) {
            score += 10
            reasons.push(`Pensado para pets idosos como ${seniorPet.name}`)
          }
          if (now.getTime() - product.createdAt.getTime() < 7 * DAY_MS) score += 5
          return { product, score, reasons }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, RECOMMENDATIONS)
        .map(({ product, reasons }) => ({
          ...toProduct(product, storage, me),
          reasons: reasons.slice(0, 3),
        }))
    },

    async listMine(user: AuthUser) {
      requireRole(user, 'COMPANY')
      const products = await db.product.findMany({
        where: { companyId: user.id },
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      })
      return products.map((product) => toProduct(product, storage))
    },

    async create(user: AuthUser, input: z.output<typeof productInputSchema>) {
      requireRole(user, 'COMPANY')
      const product = await db.product.create({
        data: { ...input, species: input.species ?? [], companyId: user.id },
      })
      return load(product.id)
    },

    async update(user: AuthUser, productId: string, input: z.output<typeof productUpdateSchema>) {
      await ownedProduct(user, productId)
      await db.product.update({ where: { id: productId }, data: input })
      return load(productId)
    },

    async remove(user: AuthUser, productId: string) {
      const product = await ownedProduct(user, productId)
      await db.product.delete({ where: { id: productId } })
      if (product.imageKey) await storage.delete([product.imageKey])
    },

    async setImage(user: AuthUser, productId: string, file: Buffer) {
      const product = await ownedProduct(user, productId)
      const image = await processImage(file)
      const key = newStorageKey(`products/${productId}`, 'webp')
      await storage.put(key, image, 'image/webp')
      await db.product.update({ where: { id: productId }, data: { imageKey: key } })
      if (product.imageKey) await storage.delete([product.imageKey])
      return load(productId)
    },
  }
}
