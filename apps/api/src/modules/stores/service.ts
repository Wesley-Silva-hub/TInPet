import type {
  RatingSummary,
  StoreSummary,
  storeProfileInputSchema,
  storesQuerySchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { meInclude, toMe } from '../../shared/dto'
import { notFound } from '../../shared/errors'
import { distanceKm } from '../../shared/geo'
import { ratingSummaries, summaryOf } from './reviews'

const storeInclude = {
  company: true,
  products: {
    where: { isActive: true },
    select: { imageKey: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.UserInclude

type StoreRow = Prisma.UserGetPayload<{ include: typeof storeInclude }>

export function createStoreService({ db, storage }: AppDeps) {
  function toStore(
    row: StoreRow,
    viewer: { latitude: number | null; longitude: number | null } | null,
    rating: RatingSummary,
  ): StoreSummary {
    const company = row.company
    const logoKey = row.avatarKey ?? row.products.find((product) => product.imageKey)?.imageKey
    return {
      id: row.id,
      tradeName: company?.tradeName ?? row.name,
      kind: company?.kind ?? 'OTHER',
      description: company?.description ?? '',
      city: row.city,
      neighborhood: company?.neighborhood ?? '',
      address: company?.address ?? '',
      phone: company?.phone ?? null,
      website: company?.website ?? null,
      delivers: company?.delivers ?? false,
      logoUrl: logoKey ? storage.publicUrl(logoKey) : null,
      distanceKm: distanceKm(viewer, row),
      productCount: row.products.length,
      rating,
    }
  }

  const viewerLocation = (user: AuthUser) =>
    db.user.findUnique({ where: { id: user.id }, select: { latitude: true, longitude: true } })

  return {
    /** Lojas com perfil completo, das mais próximas para as mais distantes. */
    async list(user: AuthUser, query: z.output<typeof storesQuerySchema>): Promise<StoreSummary[]> {
      const [viewer, rows] = await Promise.all([
        viewerLocation(user),
        db.user.findMany({
          where: {
            role: 'COMPANY',
            suspendedAt: null,
            company: {
              kind: query.kind,
              ...(query.q && {
                OR: [
                  { tradeName: { contains: query.q, mode: 'insensitive' } },
                  { neighborhood: { contains: query.q, mode: 'insensitive' } },
                  { description: { contains: query.q, mode: 'insensitive' } },
                ],
              }),
            },
          },
          include: storeInclude,
          take: 200,
        }),
      ])
      const ratings = await ratingSummaries(
        db,
        rows.map((row) => row.id),
      )
      return rows
        .map((row) => toStore(row, viewer, summaryOf(ratings, row.id)))
        .filter(
          (store) =>
            query.maxDistanceKm === undefined ||
            store.distanceKm === null ||
            store.distanceKm <= query.maxDistanceKm,
        )
        .sort(
          (a, b) =>
            (a.distanceKm ?? Number.POSITIVE_INFINITY) -
              (b.distanceKm ?? Number.POSITIVE_INFINITY) ||
            a.tradeName.localeCompare(b.tradeName, 'pt-BR'),
        )
    },

    async get(user: AuthUser, storeId: string) {
      const row = await db.user.findFirst({
        where: { id: storeId, role: 'COMPANY', suspendedAt: null },
        include: storeInclude,
      })
      if (!row) throw notFound('Loja')
      const [viewer, ratings] = await Promise.all([
        viewerLocation(user),
        ratingSummaries(db, [row.id]),
      ])
      return toStore(row, viewer, summaryOf(ratings, row.id))
    },

    /** A empresa edita o perfil público da loja. */
    async updateProfile(user: AuthUser, input: z.output<typeof storeProfileInputSchema>) {
      requireRole(user, 'COMPANY')
      await db.companyProfile.update({ where: { userId: user.id }, data: input })
      const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: meInclude })
      return toMe(me, storage)
    },
  }
}
