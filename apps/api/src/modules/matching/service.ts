import {
  arePurposesCompatible,
  type FeedItem,
  type feedQuerySchema,
  type MatchSummary,
  type Page,
  petAffinity,
  type SwipeInput,
} from '@tinpet/shared'
import type { z } from 'zod'
import { type Pet as PetRow, Prisma } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import {
  decodeCursor,
  encodeCursor,
  petInclude,
  publicUserInclude,
  toDateOnly,
  toPet,
  toPublicUser,
} from '../../shared/dto'
import { badRequest, conflict, forbidden, isUniqueViolation, notFound } from '../../shared/errors'
import { createNotifier } from '../notifications/service'

const KM_PER_LATITUDE_DEGREE = 111

const affinityInput = (pet: PetRow) => ({
  size: pet.size,
  purpose: pet.purpose,
  breedId: pet.breedId,
  birthDate: pet.birthDate ? toDateOnly(pet.birthDate) : null,
})
/** Ordenação de quem não tem localização: depois de todos os que têm. */
const NO_DISTANCE_SORT_KEY = 2_147_483_647

interface FeedCursor {
  k: number
  id: string
}
const isFeedCursor = (value: unknown): value is FeedCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FeedCursor).k === 'number' &&
  typeof (value as FeedCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as FeedCursor).id)

export const matchInclude = {
  petA: { include: { ...petInclude, owner: { include: publicUserInclude } } },
  petB: { include: { ...petInclude, owner: { include: publicUserInclude } } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.MatchInclude

type MatchWithRelations = Prisma.MatchGetPayload<{ include: typeof matchInclude }>

/** Condição "o usuário é dono de um dos pets do match e não há bloqueio entre os donos". */
export function activeMatchOf(userId: string): Prisma.MatchWhereInput {
  return {
    unmatchedAt: null,
    OR: [
      { petA: { ownerId: userId }, petB: { owner: blockFreeWith(userId) } },
      { petB: { ownerId: userId }, petA: { owner: blockFreeWith(userId) } },
    ],
  }
}

function blockFreeWith(userId: string): Prisma.UserWhereInput {
  return {
    blocksMade: { none: { blockedId: userId } },
    blocksReceived: { none: { blockerId: userId } },
  }
}

export function createMatchingService(deps: AppDeps) {
  const { db, storage, realtime } = deps
  const notifier = createNotifier(deps)
  function toSummary(
    match: MatchWithRelations,
    viewerId: string,
    unreadCount: number,
  ): MatchSummary {
    const mineIsA = match.petA.ownerId === viewerId
    const myPet = mineIsA ? match.petA : match.petB
    const otherPet = mineIsA ? match.petB : match.petA
    const last = match.messages[0]
    return {
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      myPet: toPet(myPet, storage),
      otherPet: toPet(otherPet, storage),
      otherOwner: toPublicUser(otherPet.owner, storage),
      lastMessage: last
        ? {
            content: last.content,
            createdAt: last.createdAt.toISOString(),
            mine: last.senderId === viewerId,
          }
        : null,
      unreadCount,
    }
  }

  async function myActivePet(user: AuthUser, petId: string) {
    const pet = await db.pet.findUnique({ where: { id: petId } })
    if (!pet) throw notFound('Pet')
    if (pet.ownerId !== user.id) throw forbidden('Este pet não é seu')
    if (!pet.isActive) throw badRequest('PET_INACTIVE', 'Ative o pet para usar o feed')
    return pet
  }

  return {
    toSummary,

    /** Pets compatíveis ainda não avaliados, ordenados por distância (Haversine), paginados por cursor. */
    async feed(user: AuthUser, query: z.output<typeof feedQuerySchema>): Promise<Page<FeedItem>> {
      const mine = await myActivePet(user, query.petId)
      const cursor = decodeCursor(query.cursor, isFeedCursor)
      const sizes = query.sizes?.split(',')
      // Filtros opcionais do tutor: porte e faixa de idade (anos completos)
      const filters = Prisma.sql`
        ${sizes ? Prisma.sql`AND c.size::text = ANY(${sizes}::text[])` : Prisma.empty}
        ${
          query.minAge !== undefined
            ? Prisma.sql`AND c.birth_date <= CURRENT_DATE - make_interval(years => ${query.minAge}::int)`
            : Prisma.empty
        }
        ${
          query.maxAge !== undefined
            ? Prisma.sql`AND c.birth_date > CURRENT_DATE - make_interval(years => ${query.maxAge + 1}::int)`
            : Prisma.empty
        }
      `
      const latitudeWindow = query.maxDistanceKm / KM_PER_LATITUDE_DEGREE

      const rows = await db.$queryRaw<
        { id: string; distance_km: number | null; sort_key: bigint }[]
      >`
        WITH me AS (
          SELECT p.id, p.species, p.sex, p.purpose, u.id AS owner_id,
                 u.latitude AS lat, u.longitude AS lng
          FROM pets p JOIN users u ON u.id = p.owner_id
          WHERE p.id = ${query.petId}::uuid
        ),
        candidates AS (
          SELECT c.id,
            CASE WHEN me.lat IS NULL OR o.latitude IS NULL THEN NULL
            ELSE 2 * 6371 * asin(sqrt(
              power(sin(radians(o.latitude - me.lat) / 2), 2) +
              cos(radians(me.lat)) * cos(radians(o.latitude)) *
              power(sin(radians(o.longitude - me.lng) / 2), 2)
            )) END AS distance_km,
            me.lat AS my_lat
          FROM pets c
          JOIN users o ON o.id = c.owner_id
          CROSS JOIN me
          WHERE c.is_active
            AND c.owner_id <> me.owner_id
            AND o.role = 'OWNER'
            AND c.species = me.species
            AND (
              (me.purpose IN ('FRIENDSHIP', 'BOTH') AND c.purpose IN ('FRIENDSHIP', 'BOTH'))
              OR (me.purpose IN ('MATING', 'BOTH') AND c.purpose IN ('MATING', 'BOTH') AND c.sex <> me.sex)
            )
            AND (me.lat IS NULL OR o.latitude BETWEEN me.lat - ${latitudeWindow} AND me.lat + ${latitudeWindow})
            AND NOT EXISTS (
              SELECT 1 FROM swipes s WHERE s.from_pet_id = me.id AND s.to_pet_id = c.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = me.owner_id AND b.blocked_id = c.owner_id)
                 OR (b.blocker_id = c.owner_id AND b.blocked_id = me.owner_id)
            )
            ${filters}
        ),
        ranked AS (
          SELECT id, distance_km,
            COALESCE(round(distance_km * 1000), ${NO_DISTANCE_SORT_KEY})::bigint AS sort_key
          FROM candidates
          WHERE my_lat IS NULL OR distance_km <= ${query.maxDistanceKm}
        )
        SELECT id, distance_km, sort_key FROM ranked
        ${cursor ? Prisma.sql`WHERE (sort_key, id) > (${cursor.k}::bigint, ${cursor.id}::uuid)` : Prisma.empty}
        ORDER BY sort_key, id
        LIMIT ${query.limit + 1}
      `

      const page = rows.slice(0, query.limit)
      const pets = await db.pet.findMany({
        where: { id: { in: page.map((row) => row.id) } },
        include: { ...petInclude, owner: { include: publicUserInclude } },
      })
      const byId = new Map(pets.map((pet) => [pet.id, pet]))
      const items = page.flatMap((row) => {
        const pet = byId.get(row.id)
        if (!pet) return []
        const distanceKm =
          row.distance_km === null ? null : Math.max(1, Math.round(row.distance_km))
        return [
          {
            pet: toPet(pet, storage),
            owner: toPublicUser(pet.owner, storage),
            distanceKm,
            affinity: petAffinity(affinityInput(mine), affinityInput(pet), distanceKm),
          },
        ]
      })
      const last = page.at(-1)
      return {
        items,
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ k: Number(last.sort_key), id: last.id })
            : null,
      }
    },

    /** Registra o swipe; um LIKE recíproco cria o match na mesma transação. */
    async swipe(user: AuthUser, input: SwipeInput): Promise<MatchSummary | null> {
      const from = await myActivePet(user, input.fromPetId)
      const to = await db.pet.findFirst({
        where: {
          id: input.toPetId,
          isActive: true,
          owner: { role: 'OWNER', ...blockFreeWith(user.id) },
        },
      })
      if (!to) throw notFound('Pet')
      if (to.ownerId === user.id)
        throw badRequest('OWN_PET', 'Não é possível avaliar o próprio pet')
      if (to.species !== from.species || !arePurposesCompatible(from, to)) {
        throw badRequest('INCOMPATIBLE_PETS', 'Estes pets não são compatíveis')
      }

      const [petAId, petBId] = [from.id, to.id].sort() as [string, string]
      const matchId = await db.$transaction(async (tx) => {
        // Serializa swipes do mesmo par: dois LIKEs simultâneos geram exatamente um match
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${petAId}:${petBId}`}))`
        try {
          await tx.swipe.create({ data: input })
        } catch (error) {
          if (isUniqueViolation(error)) throw conflict('ALREADY_SWIPED', 'Este pet já foi avaliado')
          throw error
        }
        if (input.direction !== 'LIKE') return null
        const reciprocal = await tx.swipe.findFirst({
          where: { fromPetId: to.id, toPetId: from.id, direction: 'LIKE' },
        })
        if (!reciprocal) return null
        const match = await tx.match.create({ data: { petAId, petBId } })
        return match.id
      })
      if (!matchId) return null

      const match = await db.match.findUniqueOrThrow({
        where: { id: matchId },
        include: matchInclude,
      })
      realtime.toUsers([to.ownerId], 'match:new', toSummary(match, to.ownerId, 0))
      await notifier.matched(match.id, user.id, to.ownerId)
      return toSummary(match, user.id, 0)
    },

    async listMatches(user: AuthUser): Promise<MatchSummary[]> {
      const matches = await db.match.findMany({
        where: activeMatchOf(user.id),
        include: {
          ...matchInclude,
          _count: {
            select: { messages: { where: { readAt: null, senderId: { not: user.id } } } },
          },
        },
      })
      const lastActivity = (match: (typeof matches)[number]) =>
        (match.messages[0]?.createdAt ?? match.createdAt).getTime()
      return matches
        .sort((a, b) => lastActivity(b) - lastActivity(a))
        .map((match) => toSummary(match, user.id, match._count.messages))
    },

    async unmatch(user: AuthUser, matchId: string) {
      const result = await db.match.updateMany({
        where: { id: matchId, ...activeMatchOf(user.id) },
        data: { unmatchedAt: new Date() },
      })
      if (result.count === 0) throw notFound('Match')
    },
  }
}
