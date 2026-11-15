import {
  formatPrice,
  WALK_MAX_DAYS_AHEAD,
  WALKER_RADIUS_KM,
  type Walk,
  type Walker,
  type walkerProfileInputSchema,
  type walkRequestInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma, Species, WalkStatus } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { badRequest, conflict, forbidden, notFound } from '../../shared/errors'
import { distanceKm } from '../../shared/geo'
import { createNotifier } from '../notifications/service'

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/** Pedidos em aberto de um mesmo tutor para o mesmo passeador (evita spam). */
const MAX_OPEN_REQUESTS = 3

const walkInclude = {
  pet: {
    select: {
      id: true,
      name: true,
      photos: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
    },
  },
  walker: { select: { id: true, name: true, avatarKey: true } },
  owner: { select: { id: true, name: true, avatarKey: true } },
} satisfies Prisma.WalkRequestInclude

type WalkRow = Prisma.WalkRequestGetPayload<{ include: typeof walkInclude }>

/** Dia da semana (0 = domingo) no horário de Brasília. */
const weekdayInBrazil = (date: Date) =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(
      date,
    ),
  )

const when = (date: Date) =>
  date.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

/** Ninguém bloqueado nos dois sentidos e conta ativa. */
const reachable = (viewerId: string): Prisma.UserWhereInput => ({
  suspendedAt: null,
  blocksMade: { none: { blockedId: viewerId } },
  blocksReceived: { none: { blockerId: viewerId } },
})

/**
 * Passeadores: um tutor ativa o perfil, outros tutores pedem passeios para os seus pets e ele
 * aceita ou recusa. O pagamento é combinado direto entre os dois (o app não intermedeia).
 */
export function createWalkService(deps: AppDeps) {
  const { db, storage } = deps
  const notifier = createNotifier(deps)
  const avatar = (key: string | null) => (key ? storage.publicUrl(key) : null)

  const toWalk = (row: WalkRow, viewerId: string): Walk => {
    const photo = row.pet.photos[0]?.storageKey
    return {
      id: row.id,
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      priceCents: row.priceCents,
      note: row.note,
      responseNote: row.responseNote,
      pet: {
        id: row.pet.id,
        name: row.pet.name,
        photoUrl: photo ? storage.publicUrl(photo) : null,
      },
      walker: { id: row.walker.id, name: row.walker.name, avatarUrl: avatar(row.walker.avatarKey) },
      owner: { id: row.owner.id, name: row.owner.name, avatarUrl: avatar(row.owner.avatarKey) },
      myRole: row.walkerId === viewerId ? 'WALKER' : 'OWNER',
      createdAt: row.createdAt.toISOString(),
    }
  }

  async function walkerById(viewer: AuthUser, walkerId: string): Promise<Walker> {
    const [row, me, done] = await Promise.all([
      db.walkerProfile.findFirst({
        where: {
          userId: walkerId,
          ...(walkerId !== viewer.id && { active: true, user: reachable(viewer.id) }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarKey: true,
              city: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
      db.user.findUnique({ where: { id: viewer.id }, select: { latitude: true, longitude: true } }),
      db.walkRequest.count({ where: { walkerId, status: 'DONE' } }),
    ])
    if (!row) throw notFound('Passeador')
    return {
      id: row.user.id,
      name: row.user.name,
      avatarUrl: avatar(row.user.avatarKey),
      city: row.user.city,
      bio: row.bio,
      priceCents: row.priceCents,
      walkMinutes: row.walkMinutes,
      neighborhoods: row.neighborhoods,
      species: row.species,
      weekdays: row.weekdays,
      active: row.active,
      distanceKm: walkerId === viewer.id ? null : distanceKm(me, row.user),
      completedWalks: done,
    }
  }

  async function findWalk(viewer: AuthUser, walkId: string) {
    const row = await db.walkRequest.findUnique({ where: { id: walkId }, include: walkInclude })
    if (!row || (row.walkerId !== viewer.id && row.ownerId !== viewer.id)) throw notFound('Passeio')
    return row
  }

  /** Troca de status condicional: duas ações ao mesmo tempo não passam as duas. */
  async function transition(
    row: WalkRow,
    from: WalkStatus[],
    to: WalkStatus,
    extra: Prisma.WalkRequestUpdateManyMutationInput = {},
  ) {
    const { count } = await db.walkRequest.updateMany({
      where: { id: row.id, status: { in: from } },
      data: { status: to, ...extra },
    })
    if (count === 0)
      throw conflict('WALK_STATE', 'Este passeio mudou de situação. Atualize a tela.')
  }

  return {
    async myProfile(user: AuthUser): Promise<Walker | null> {
      const exists = await db.walkerProfile.count({ where: { userId: user.id } })
      return exists ? walkerById(user, user.id) : null
    },

    async saveProfile(user: AuthUser, input: z.output<typeof walkerProfileInputSchema>) {
      if (user.role !== 'OWNER') throw forbidden('Apenas tutores podem ser passeadores')
      const me = await db.user.findUnique({ where: { id: user.id }, select: { latitude: true } })
      if (me?.latitude == null) {
        throw badRequest('NO_LOCATION', 'Ative a localização para aparecer para os vizinhos')
      }
      const data = { ...input, species: input.species as Species[] }
      await db.walkerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      })
      return walkerById(user, user.id)
    },

    /** Passeadores ativos a até 20 km, do mais perto para o mais longe. */
    async listNearby(user: AuthUser, species?: Species): Promise<Walker[]> {
      const me = await db.user.findUnique({
        where: { id: user.id },
        select: { latitude: true, longitude: true },
      })
      const rows = await db.walkerProfile.findMany({
        where: {
          active: true,
          userId: { not: user.id },
          user: reachable(user.id),
          ...(species && { species: { has: species } }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarKey: true,
              city: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        take: 300,
      })
      const done = await db.walkRequest.groupBy({
        by: ['walkerId'],
        where: { walkerId: { in: rows.map((row) => row.userId) }, status: 'DONE' },
        _count: { _all: true },
      })
      const doneBy = new Map(done.map((group) => [group.walkerId, group._count._all]))
      return rows
        .map((row) => ({
          id: row.user.id,
          name: row.user.name,
          avatarUrl: avatar(row.user.avatarKey),
          city: row.user.city,
          bio: row.bio,
          priceCents: row.priceCents,
          walkMinutes: row.walkMinutes,
          neighborhoods: row.neighborhoods,
          species: row.species,
          weekdays: row.weekdays,
          active: row.active,
          distanceKm: distanceKm(me, row.user),
          completedWalks: doneBy.get(row.userId) ?? 0,
        }))
        .filter((walker) => walker.distanceKm === null || walker.distanceKm <= WALKER_RADIUS_KM)
        .sort(
          (a, b) =>
            (a.distanceKm ?? Number.POSITIVE_INFINITY) -
              (b.distanceKm ?? Number.POSITIVE_INFINITY) || b.completedWalks - a.completedWalks,
        )
    },

    get: walkerById,

    /** Pedido de passeio: confere o pet, a agenda do passeador e choque de horário. */
    async request(user: AuthUser, input: z.output<typeof walkRequestInputSchema>) {
      if (input.walkerId === user.id) throw badRequest('SELF_TARGET', 'Você não pode se contratar')
      const startsAt = new Date(input.startsAt)
      if (startsAt.getTime() < Date.now() + 30 * MINUTE_MS) {
        throw badRequest('WALK_TOO_SOON', 'Peça com pelo menos 30 minutos de antecedência')
      }
      if (startsAt.getTime() > Date.now() + WALK_MAX_DAYS_AHEAD * DAY_MS) {
        throw badRequest('WALK_TOO_FAR', `Peça com até ${WALK_MAX_DAYS_AHEAD} dias de antecedência`)
      }
      const [pet, walker] = await Promise.all([
        db.pet.findUnique({
          where: { id: input.petId },
          select: { ownerId: true, name: true, species: true },
        }),
        db.walkerProfile.findFirst({
          where: { userId: input.walkerId, active: true, user: reachable(user.id) },
        }),
      ])
      if (!pet || pet.ownerId !== user.id)
        throw badRequest('INVALID_PET', 'Escolha um dos seus pets')
      if (!walker) throw notFound('Passeador')
      if (!walker.species.includes(pet.species)) {
        throw badRequest('WALKER_SPECIES', 'Este passeador não atende essa espécie')
      }
      if (!walker.weekdays.includes(weekdayInBrazil(startsAt))) {
        throw badRequest('WALKER_DAY_OFF', 'O passeador não atende neste dia da semana')
      }
      const endsAt = new Date(startsAt.getTime() + input.durationMinutes * MINUTE_MS)
      const [open, busy] = await Promise.all([
        db.walkRequest.count({
          where: { ownerId: user.id, walkerId: input.walkerId, status: 'REQUESTED' },
        }),
        db.walkRequest.findMany({
          where: {
            walkerId: input.walkerId,
            status: 'ACCEPTED',
            startsAt: { lt: endsAt, gt: new Date(startsAt.getTime() - 180 * MINUTE_MS) },
          },
          select: { startsAt: true, durationMinutes: true },
        }),
      ])
      if (open >= MAX_OPEN_REQUESTS) {
        throw badRequest('WALK_LIMIT', 'Espere a resposta dos pedidos que você já fez')
      }
      const clash = busy.some(
        (walk) => walk.startsAt.getTime() + walk.durationMinutes * MINUTE_MS > startsAt.getTime(),
      )
      if (clash)
        throw conflict('WALKER_BUSY', 'O passeador já tem passeio confirmado neste horário')

      const row = await db.walkRequest.create({
        data: {
          walkerId: input.walkerId,
          ownerId: user.id,
          petId: input.petId,
          startsAt,
          durationMinutes: input.durationMinutes,
          priceCents: walker.priceCents,
          note: input.note,
        },
        include: walkInclude,
      })
      await notifier.walk({
        type: 'WALK_REQUESTED',
        userId: input.walkerId,
        actorId: user.id,
        walkId: row.id,
        petId: input.petId,
        preview: `${pet.name}, ${when(startsAt)} (${input.durationMinutes} min, ${formatPrice(walker.priceCents)})`,
      })
      return toWalk(row, user.id)
    },

    /** Meus passeios (como tutor e como passeador): próximos primeiro, depois os passados. */
    async listMine(user: AuthUser): Promise<Walk[]> {
      const rows = await db.walkRequest.findMany({
        where: { OR: [{ ownerId: user.id }, { walkerId: user.id }] },
        include: walkInclude,
        orderBy: { startsAt: 'desc' },
        take: 100,
      })
      const now = Date.now()
      const upcoming = rows
        .filter((row) => row.startsAt.getTime() >= now)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      const past = rows.filter((row) => row.startsAt.getTime() < now)
      return [...upcoming, ...past].map((row) => toWalk(row, user.id))
    },

    async accept(user: AuthUser, walkId: string, note: string) {
      const row = await findWalk(user, walkId)
      if (row.walkerId !== user.id) throw forbidden('Só o passeador responde o pedido')
      const endsAt = new Date(row.startsAt.getTime() + row.durationMinutes * MINUTE_MS)
      const clash = await db.walkRequest.count({
        where: {
          walkerId: user.id,
          status: 'ACCEPTED',
          id: { not: row.id },
          startsAt: { lt: endsAt, gt: new Date(row.startsAt.getTime() - 180 * MINUTE_MS) },
        },
      })
      if (clash > 0) throw conflict('WALKER_BUSY', 'Você já tem passeio confirmado neste horário')
      await transition(row, ['REQUESTED'], 'ACCEPTED', {
        respondedAt: new Date(),
        responseNote: note,
      })
      await notifier.walk({
        type: 'WALK_ACCEPTED',
        userId: row.ownerId,
        actorId: user.id,
        walkId: row.id,
        petId: row.petId,
        preview: `${row.pet.name}, ${when(row.startsAt)}${note ? `: “${note}”` : ''}`,
      })
      return toWalk(await findWalk(user, walkId), user.id)
    },

    async decline(user: AuthUser, walkId: string, note: string) {
      const row = await findWalk(user, walkId)
      if (row.walkerId !== user.id) throw forbidden('Só o passeador responde o pedido')
      await transition(row, ['REQUESTED'], 'DECLINED', {
        respondedAt: new Date(),
        responseNote: note,
      })
      await notifier.walk({
        type: 'WALK_DECLINED',
        userId: row.ownerId,
        actorId: user.id,
        walkId: row.id,
        petId: row.petId,
        preview: `${row.pet.name}, ${when(row.startsAt)}${note ? `: “${note}”` : ''}`,
      })
      return toWalk(await findWalk(user, walkId), user.id)
    },

    /** Qualquer um dos dois cancela antes do horário; o outro é avisado. */
    async cancel(user: AuthUser, walkId: string) {
      const row = await findWalk(user, walkId)
      if (row.startsAt.getTime() <= Date.now()) {
        throw badRequest('WALK_STARTED', 'O passeio já começou')
      }
      await transition(row, ['REQUESTED', 'ACCEPTED'], 'CANCELLED')
      const other = row.walkerId === user.id ? row.ownerId : row.walkerId
      await notifier.walk({
        type: 'WALK_CANCELLED',
        userId: other,
        actorId: user.id,
        walkId: row.id,
        petId: row.petId,
        preview: `${row.pet.name}, ${when(row.startsAt)}`,
      })
      return toWalk(await findWalk(user, walkId), user.id)
    },

    /** O passeador marca como feito depois do horário (conta no perfil dele). */
    async complete(user: AuthUser, walkId: string) {
      const row = await findWalk(user, walkId)
      if (row.walkerId !== user.id) throw forbidden('Só o passeador marca como feito')
      if (row.startsAt.getTime() > Date.now()) {
        throw badRequest('WALK_NOT_STARTED', 'O passeio ainda não aconteceu')
      }
      await transition(row, ['ACCEPTED'], 'DONE')
      return toWalk(await findWalk(user, walkId), user.id)
    },
  }
}
