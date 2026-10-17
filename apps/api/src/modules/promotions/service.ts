import {
  discountedPrice,
  type MyPromotion,
  type Promotion,
  type PromotionStatus,
  type promotionInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { productInclude, toProduct } from '../../shared/dto'
import { badRequest, forbidden, notFound } from '../../shared/errors'
import { type Coordinates, distanceKm } from '../../shared/geo'

const HOUR_MS = 60 * 60 * 1000
const FOR_YOU_LIMIT = 8

const promotionInclude = {
  product: { include: productInclude },
  _count: { select: { impressions: true } },
} satisfies Prisma.PromotionInclude

type PromotionRow = Prisma.PromotionGetPayload<{ include: typeof promotionInclude }>

/** Promoção no ar agora (não pausada, dentro do período, produto ativo). */
const liveWhere = (now: Date): Prisma.PromotionWhereInput => ({
  pausedAt: null,
  startsAt: { lte: now },
  endsAt: { gt: now },
  product: { isActive: true },
})

export function statusOf(
  row: { pausedAt: Date | null; endsAt: Date },
  now = new Date(),
): PromotionStatus {
  if (row.endsAt <= now) return 'ENDED'
  if (row.pausedAt) return 'PAUSED'
  return 'ACTIVE'
}

const today = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function createPromotionService({ db, storage }: AppDeps) {
  const toPromotion = (row: PromotionRow, viewer: Coordinates | null = null): Promotion => ({
    id: row.id,
    headline: row.headline,
    discountPercent: row.discountPercent,
    hasCoupon: Boolean(row.couponCode),
    endsAt: row.endsAt.toISOString(),
    finalPriceCents: discountedPrice(row.product.priceCents, row.discountPercent),
    product: toProduct(row.product, storage, viewer),
  })

  const toMine = (row: PromotionRow): MyPromotion => ({
    ...toPromotion(row),
    couponCode: row.couponCode,
    species: row.species,
    radiusKm: row.radiusKm,
    startsAt: row.startsAt.toISOString(),
    status: statusOf(row),
    impressions: row._count.impressions,
    clicks: row.clicks,
    couponReveals: row.couponReveals,
  })

  async function owned(user: AuthUser, promotionId: string) {
    requireRole(user, 'COMPANY')
    const row = await db.promotion.findUnique({ where: { id: promotionId } })
    if (!row) throw notFound('Anúncio')
    if (row.companyId !== user.id) throw forbidden('Este anúncio não é seu')
    return row
  }

  return {
    statusOf,

    async create(user: AuthUser, input: z.output<typeof promotionInputSchema>) {
      requireRole(user, 'COMPANY')
      const product = await db.product.findUnique({ where: { id: input.productId } })
      if (!product || product.companyId !== user.id) {
        throw badRequest('INVALID_PRODUCT', 'Escolha um dos seus produtos')
      }
      if (!product.isActive) {
        throw badRequest('INACTIVE_PRODUCT', 'Publique o produto na vitrine antes de impulsionar')
      }
      const now = new Date()
      const row = await db.promotion.create({
        data: {
          companyId: user.id,
          productId: product.id,
          headline: input.headline,
          discountPercent: input.discountPercent,
          couponCode: input.couponCode,
          species: input.species,
          radiusKm: input.radiusKm,
          startsAt: now,
          endsAt: new Date(now.getTime() + input.durationHours * HOUR_MS),
        },
        include: promotionInclude,
      })
      return toMine(row)
    },

    /** Painel da loja: anúncios com resultados, os no ar primeiro. */
    async listMine(user: AuthUser) {
      requireRole(user, 'COMPANY')
      const rows = await db.promotion.findMany({
        where: { companyId: user.id },
        include: promotionInclude,
        orderBy: { createdAt: 'desc' },
      })
      const rank: Record<PromotionStatus, number> = { ACTIVE: 0, PAUSED: 1, ENDED: 2 }
      return rows.map(toMine).sort((a, b) => rank[a.status] - rank[b.status])
    },

    async setPaused(user: AuthUser, promotionId: string, paused: boolean) {
      const row = await owned(user, promotionId)
      if (row.endsAt <= new Date()) throw badRequest('PROMOTION_ENDED', 'Este anúncio já terminou')
      const updated = await db.promotion.update({
        where: { id: promotionId },
        data: { pausedAt: paused ? new Date() : null },
        include: promotionInclude,
      })
      return toMine(updated)
    },

    async remove(user: AuthUser, promotionId: string) {
      await owned(user, promotionId)
      await db.promotion.delete({ where: { id: promotionId } })
    },

    /**
     * Ofertas para quem está vendo: só espécies que o tutor tem e lojas dentro do raio do
     * anúncio. Sem localização de algum lado, a oferta aparece (melhor que esconder tudo).
     */
    async forYou(user: AuthUser): Promise<Promotion[]> {
      const now = new Date()
      const [viewer, pets, rows] = await Promise.all([
        db.user.findUnique({ where: { id: user.id }, select: { latitude: true, longitude: true } }),
        db.pet.findMany({ where: { ownerId: user.id }, select: { species: true } }),
        db.promotion.findMany({
          where: { ...liveWhere(now), companyId: { not: user.id } },
          include: promotionInclude,
          orderBy: { endsAt: 'asc' },
          take: 100,
        }),
      ])
      const mySpecies = new Set(pets.map((pet) => pet.species))
      return rows
        .filter(
          (row) =>
            row.species.length === 0 ||
            mySpecies.size === 0 ||
            row.species.some((s) => mySpecies.has(s)),
        )
        .filter((row) => {
          const km = distanceKm(viewer, row.product.company)
          return km === null || km <= row.radiusKm
        })
        .slice(0, FOR_YOU_LIMIT)
        .map((row) => toPromotion(row, viewer))
    },

    /** Visualização única por pessoa por dia; cliques somam. A própria loja não conta. */
    async recordEvent(user: AuthUser, promotionId: string, type: 'view' | 'click') {
      const row = await db.promotion.findFirst({
        where: { id: promotionId, ...liveWhere(new Date()) },
        select: { companyId: true },
      })
      if (!row || row.companyId === user.id) return
      if (type === 'view') {
        await db.promotionImpression.upsert({
          where: { promotionId_userId_day: { promotionId, userId: user.id, day: today() } },
          create: { promotionId, userId: user.id, day: today() },
          update: {},
        })
      } else {
        await db.promotion.update({
          where: { id: promotionId },
          data: { clicks: { increment: 1 } },
        })
      }
    },

    /** Revela o cupom (e conta quantos pegaram). */
    async revealCoupon(user: AuthUser, promotionId: string) {
      const row = await db.promotion.findFirst({
        where: { id: promotionId, ...liveWhere(new Date()) },
        select: { couponCode: true, companyId: true },
      })
      if (!row?.couponCode) throw notFound('Cupom')
      if (row.companyId !== user.id) {
        await db.promotion.update({
          where: { id: promotionId },
          data: { couponReveals: { increment: 1 } },
        })
      }
      return { couponCode: row.couponCode }
    },
  }
}
