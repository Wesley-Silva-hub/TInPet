import {
  EVENT_NOTIFY_RADIUS_KM,
  type eventInputSchema,
  eventKindLabels,
  type PetEvent,
  type PetEventDetail,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { roundCoordinate } from '../../shared/dto'
import { badRequest, forbidden, notFound } from '../../shared/errors'
import { type Coordinates, distanceKm } from '../../shared/geo'
import { ownersNear } from '../../shared/neighbors'
import { createNotifier } from '../notifications/service'

/** Eventos mostrados na lista "perto de você". */
const LIST_RADIUS_KM = 50
const LIST_LIMIT = 40
/** Evento que já começou continua na lista por um tempo (quem chega atrasado ainda acha). */
const STARTED_GRACE_MS = 3 * 60 * 60 * 1000
/** Eventos futuros abertos por pessoa (evita spam de avisos). */
export const MAX_OPEN_EVENTS = 5
const ATTENDEE_PREVIEW = 12

const eventInclude = {
  organizer: { select: { id: true, name: true, avatarKey: true } },
  _count: { select: { attendees: true } },
} satisfies Prisma.PetEventInclude

type EventRow = Prisma.PetEventGetPayload<{ include: typeof eventInclude }>

const when = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

export function createEventService(deps: AppDeps) {
  const { db, storage } = deps
  const notifier = createNotifier(deps)
  const avatar = (key: string | null) => (key ? storage.publicUrl(key) : null)

  const locationOf = (userId: string): Promise<Coordinates | null> =>
    db.user.findUnique({ where: { id: userId }, select: { latitude: true, longitude: true } })

  /** Esconde eventos de quem eu bloqueei, de quem me bloqueou e de contas suspensas. */
  const visibleTo = (userId: string) =>
    ({
      organizer: {
        suspendedAt: null,
        blocksMade: { none: { blockedId: userId } },
        blocksReceived: { none: { blockerId: userId } },
      },
    }) satisfies Prisma.PetEventWhereInput

  const toEvent = (
    row: EventRow,
    viewerId: string,
    viewer: Coordinates | null,
    going: boolean,
  ): PetEvent => ({
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    species: row.species,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    place: row.place,
    neighborhood: row.neighborhood,
    distanceKm: distanceKm(viewer, row),
    organizer: {
      id: row.organizer.id,
      name: row.organizer.name,
      avatarUrl: avatar(row.organizer.avatarKey),
    },
    attendeeCount: row._count.attendees,
    going,
    isMine: row.organizerId === viewerId,
    cancelled: row.cancelledAt !== null,
  })

  async function findVisible(user: AuthUser, eventId: string) {
    const row = await db.petEvent.findFirst({
      where: { id: eventId, ...visibleTo(user.id) },
      include: eventInclude,
    })
    if (!row) throw notFound('Evento')
    return row
  }

  async function detail(user: AuthUser, eventId: string): Promise<PetEventDetail> {
    const row = await findVisible(user, eventId)
    const [viewer, mine, attendees] = await Promise.all([
      locationOf(user.id),
      db.eventAttendee.count({ where: { eventId, userId: user.id } }),
      db.eventAttendee.findMany({
        where: { eventId },
        select: { user: { select: { id: true, name: true, avatarKey: true } } },
        orderBy: { createdAt: 'asc' },
        take: ATTENDEE_PREVIEW,
      }),
    ])
    return {
      ...toEvent(row, user.id, viewer, mine > 0),
      attendees: attendees.map(({ user: person }) => ({
        id: person.id,
        name: person.name,
        avatarUrl: avatar(person.avatarKey),
      })),
    }
  }

  return {
    /** Cria o evento e avisa os tutores num raio de 10 km. */
    async create(user: AuthUser, input: z.output<typeof eventInputSchema>) {
      if (user.role === 'ADMIN') throw forbidden('Moderadores não organizam eventos')
      const open = await db.petEvent.count({
        where: { organizerId: user.id, cancelledAt: null, startsAt: { gt: new Date() } },
      })
      if (open >= MAX_OPEN_EVENTS) {
        throw badRequest('EVENT_LIMIT', `Você já tem ${MAX_OPEN_EVENTS} eventos marcados`)
      }
      const point =
        input.latitude !== null && input.longitude !== null
          ? { latitude: input.latitude, longitude: input.longitude }
          : await locationOf(user.id)
      if (point?.latitude == null || point.longitude == null) {
        throw badRequest('NO_LOCATION', 'Ative a localização para marcar o evento no mapa')
      }
      const latitude = roundCoordinate(point.latitude)
      const longitude = roundCoordinate(point.longitude)
      const row = await db.petEvent.create({
        data: {
          organizerId: user.id,
          title: input.title,
          description: input.description,
          kind: input.kind,
          species: input.species,
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          place: input.place,
          neighborhood: input.neighborhood,
          latitude,
          longitude,
        },
      })
      const neighbors = await ownersNear(
        db,
        { latitude, longitude },
        EVENT_NOTIFY_RADIUS_KM,
        user.id,
      )
      const label = eventKindLabels[input.kind].toLowerCase()
      await notifier.eventNearby(
        row.id,
        user.id,
        neighbors,
        `${input.title} (${label}) ${when(row.startsAt)} em ${input.place}`.slice(0, 140),
      )
      return { ...(await detail(user, row.id)), notified: neighbors.length }
    },

    /** Próximos eventos perto de quem está vendo (os meus e os que vou sempre aparecem). */
    async listUpcoming(user: AuthUser): Promise<PetEvent[]> {
      const [viewer, rows, going] = await Promise.all([
        locationOf(user.id),
        db.petEvent.findMany({
          where: {
            cancelledAt: null,
            startsAt: { gt: new Date(Date.now() - STARTED_GRACE_MS) },
            ...visibleTo(user.id),
          },
          include: eventInclude,
          orderBy: { startsAt: 'asc' },
          take: 300,
        }),
        db.eventAttendee.findMany({ where: { userId: user.id }, select: { eventId: true } }),
      ])
      const goingIds = new Set(going.map((item) => item.eventId))
      return rows
        .map((row) => toEvent(row, user.id, viewer, goingIds.has(row.id)))
        .filter(
          (event) =>
            event.isMine ||
            event.going ||
            event.distanceKm === null ||
            event.distanceKm <= LIST_RADIUS_KM,
        )
        .slice(0, LIST_LIMIT)
    },

    get: detail,

    async attend(user: AuthUser, eventId: string) {
      const row = await findVisible(user, eventId)
      if (row.cancelledAt) throw badRequest('EVENT_CANCELLED', 'Este evento foi cancelado')
      if ((row.endsAt ?? new Date(row.startsAt.getTime() + STARTED_GRACE_MS)) < new Date()) {
        throw badRequest('EVENT_FINISHED', 'Este evento já terminou')
      }
      await db.eventAttendee.upsert({
        where: { eventId_userId: { eventId, userId: user.id } },
        create: { eventId, userId: user.id },
        update: {},
      })
      return detail(user, eventId)
    },

    async unattend(user: AuthUser, eventId: string) {
      await findVisible(user, eventId)
      await db.eventAttendee.deleteMany({ where: { eventId, userId: user.id } })
      return detail(user, eventId)
    },

    /** Só quem organiza cancela; quem tinha confirmado presença é avisado. */
    async cancel(user: AuthUser, eventId: string) {
      const row = await db.petEvent.findUnique({ where: { id: eventId } })
      if (!row) throw notFound('Evento')
      if (row.organizerId !== user.id) throw forbidden('Só quem organiza pode cancelar')
      if (row.cancelledAt) return detail(user, eventId)
      await db.petEvent.update({ where: { id: eventId }, data: { cancelledAt: new Date() } })
      const attendees = await db.eventAttendee.findMany({
        where: { eventId },
        select: { userId: true },
      })
      await notifier.eventCancelled(
        eventId,
        user.id,
        attendees.map((item) => item.userId),
        `${row.title} (${when(row.startsAt)}) foi cancelado`,
      )
      return detail(user, eventId)
    },
  }
}
