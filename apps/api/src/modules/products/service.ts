import type {
  Page,
  Product,
  productInputSchema,
  productsQuerySchema,
  productUpdateSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor, productInclude, toProduct } from '../../shared/dto'
import { forbidden, notFound } from '../../shared/errors'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

interface ProductCursor {
  t: string
  id: string
}
const isProductCursor = (value: unknown): value is ProductCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ProductCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as ProductCursor).t)) &&
  typeof (value as ProductCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as ProductCursor).id)

export function createProductService({ db, storage }: AppDeps) {
  async function ownedProduct(user: AuthUser, productId: string) {
    requireRole(user, 'COMPANY')
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) throw notFound('Produto')
    if (product.companyId !== user.id) throw forbidden('Este produto não é seu')
    return product
  }

  const load = async (id: string) =>
    toProduct(
      await db.product.findUniqueOrThrow({ where: { id }, include: productInclude }),
      storage,
    )

  return {
    /** Vitrine pública: só produtos ativos, com busca e filtros; mais recentes primeiro. */
    async list(query: z.output<typeof productsQuerySchema>): Promise<Page<Product>> {
      const cursor = decodeCursor(query.cursor, isProductCursor)
      const where: Prisma.ProductWhereInput = {
        isActive: true,
        category: query.category,
        companyId: query.companyId,
        priceCents: { gte: query.minPriceCents, lte: query.maxPriceCents },
        ...(query.q && {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
          ],
        }),
        ...(cursor && {
          AND: [
            {
              OR: [
                { createdAt: { lt: new Date(cursor.t) } },
                { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
              ],
            },
          ],
        }),
      }
      const rows = await db.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((product) => toProduct(product, storage)),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async get(productId: string) {
      const product = await db.product.findFirst({
        where: { id: productId, isActive: true },
        include: productInclude,
      })
      if (!product) throw notFound('Produto')
      return toProduct(product, storage)
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
      const product = await db.product.create({ data: { ...input, companyId: user.id } })
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
