import type {
  RatingSummary,
  StoreReview,
  StoreReviews,
  storeReviewInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { notFound } from '../../shared/errors'
import type { Db } from '../../shared/prisma'

const REVIEWS_LIMIT = 50

const reviewInclude = {
  author: { select: { id: true, name: true, avatarKey: true } },
} satisfies Prisma.StoreReviewInclude

type ReviewRow = Prisma.StoreReviewGetPayload<{ include: typeof reviewInclude }>

const EMPTY: RatingSummary = { average: null, count: 0 }

/** Média (1 casa) e total de avaliações por loja, numa consulta só. */
export async function ratingSummaries(
  db: Db,
  storeIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (storeIds.length === 0) return new Map()
  const groups = await db.storeReview.groupBy({
    by: ['storeId'],
    where: { storeId: { in: storeIds } },
    _avg: { rating: true },
    _count: { _all: true },
  })
  return new Map(
    groups.map((group) => [
      group.storeId,
      {
        average: group._avg.rating === null ? null : Math.round(group._avg.rating * 10) / 10,
        count: group._count._all,
      },
    ]),
  )
}

export const summaryOf = (summaries: Map<string, RatingSummary>, storeId: string) =>
  summaries.get(storeId) ?? EMPTY

/** Avaliações de lojas: só tutores avaliam, uma vez por loja (a nova substitui a antiga). */
export function createReviewService({ db, storage }: AppDeps) {
  const toReview = (row: ReviewRow, viewerId: string): StoreReview => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.author.id,
      name: row.author.name,
      avatarUrl: row.author.avatarKey ? storage.publicUrl(row.author.avatarKey) : null,
    },
    isMine: row.authorId === viewerId,
  })

  async function assertStore(storeId: string) {
    const exists = await db.user.count({ where: { id: storeId, role: 'COMPANY' } })
    if (!exists) throw notFound('Loja')
  }

  async function list(user: AuthUser, storeId: string): Promise<StoreReviews> {
    await assertStore(storeId)
    const [rows, mine, summaries] = await Promise.all([
      db.storeReview.findMany({
        where: {
          storeId,
          // Avaliação de quem eu bloqueei ou de quem me bloqueou não aparece
          author: {
            suspendedAt: null,
            blocksMade: { none: { blockedId: user.id } },
            blocksReceived: { none: { blockerId: user.id } },
          },
        },
        include: reviewInclude,
        orderBy: { updatedAt: 'desc' },
        take: REVIEWS_LIMIT,
      }),
      db.storeReview.findUnique({
        where: { storeId_authorId: { storeId, authorId: user.id } },
        include: reviewInclude,
      }),
      ratingSummaries(db, [storeId]),
    ])
    return {
      summary: summaryOf(summaries, storeId),
      mine: mine && toReview(mine, user.id),
      items: rows.map((row) => toReview(row, user.id)),
    }
  }

  return {
    list,

    async upsert(user: AuthUser, storeId: string, input: z.output<typeof storeReviewInputSchema>) {
      requireRole(user, 'OWNER')
      await assertStore(storeId)
      await db.storeReview.upsert({
        where: { storeId_authorId: { storeId, authorId: user.id } },
        create: { storeId, authorId: user.id, ...input },
        update: input,
      })
      return list(user, storeId)
    },

    async remove(user: AuthUser, storeId: string) {
      await assertStore(storeId)
      await db.storeReview.deleteMany({ where: { storeId, authorId: user.id } })
      return list(user, storeId)
    },
  }
}
