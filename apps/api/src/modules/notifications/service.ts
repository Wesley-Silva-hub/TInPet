import type { Notification, notificationsQuerySchema, Page } from '@tinpet/shared'
import type { z } from 'zod'
import type { NotificationType, Prisma } from '../../generated/prisma/client'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor } from '../../shared/dto'

const PREVIEW_LENGTH = 140

interface TimeCursor {
  t: string
  id: string
}
const isTimeCursor = (value: unknown): value is TimeCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TimeCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as TimeCursor).t)) &&
  typeof (value as TimeCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as TimeCursor).id)

const petPreviewSelect = {
  select: {
    name: true,
    photos: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
  },
} as const

const notificationInclude = {
  actor: { select: { id: true, name: true, avatarKey: true } },
  post: { select: { imageKey: true } },
  pet: petPreviewSelect,
  alert: { select: { pet: petPreviewSelect } },
} satisfies Prisma.NotificationInclude

type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>

/**
 * Cria avisos e os entrega em tempo real. Nunca avisa a pessoa da própria ação, e curtir/descurtir
 * repetidamente não gera avisos duplicados.
 */
export function createNotifier({ db, storage, realtime }: AppDeps) {
  const toNotification = (row: NotificationRow): Notification => {
    const pet = row.pet ?? row.alert?.pet ?? null
    const petPhoto = pet?.photos[0]?.storageKey
    return {
      id: row.id,
      type: row.type,
      actor: row.actor && {
        id: row.actor.id,
        name: row.actor.name,
        avatarUrl: row.actor.avatarKey ? storage.publicUrl(row.actor.avatarKey) : null,
      },
      postId: row.postId,
      postImageUrl: row.post ? storage.publicUrl(row.post.imageKey) : null,
      matchId: row.matchId,
      petId: row.petId,
      alertId: row.alertId,
      petName: pet?.name ?? null,
      petPhotoUrl: petPhoto ? storage.publicUrl(petPhoto) : null,
      preview: row.preview,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    }
  }

  async function create(data: {
    userId: string
    /** Nulo quando quem agiu não tem conta (achou o pet pela plaquinha). */
    actorId: string | null
    type: NotificationType
    postId?: string
    matchId?: string
    petId?: string
    alertId?: string
    preview?: string
  }) {
    if (data.userId === data.actorId) return
    const row = await db.notification.create({ data, include: notificationInclude })
    realtime.toUsers([data.userId], 'notification:new', toNotification(row))
  }

  return {
    toNotification,

    async postLiked(actorId: string, postId: string) {
      const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
      if (!post) return
      const existing = await db.notification.count({
        where: { type: 'POST_LIKE', actorId, postId },
      })
      if (existing === 0)
        await create({ userId: post.authorId, actorId, type: 'POST_LIKE', postId })
    },

    /** Descurtiu: o aviso some (evita "fulano curtiu" de algo que já não vale). */
    async postUnliked(actorId: string, postId: string) {
      await db.notification.deleteMany({ where: { type: 'POST_LIKE', actorId, postId } })
    },

    async postCommented(actorId: string, postId: string, content: string) {
      const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
      if (!post) return
      await create({
        userId: post.authorId,
        actorId,
        type: 'POST_COMMENT',
        postId,
        preview: content.slice(0, PREVIEW_LENGTH),
      })
    },

    async matched(matchId: string, ownerA: string, ownerB: string) {
      await create({ userId: ownerA, actorId: ownerB, type: 'MATCH', matchId })
      await create({ userId: ownerB, actorId: ownerA, type: 'MATCH', matchId })
    },

    /** Avisa os vizinhos de um pet perdido de uma vez (sem um evento por linha no banco). */
    async lostPetNearby(alertId: string, ownerId: string, userIds: string[], preview: string) {
      const recipients = userIds.filter((id) => id !== ownerId)
      if (recipients.length === 0) return
      await db.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          actorId: ownerId,
          type: 'LOST_PET_NEARBY' as const,
          alertId,
          preview,
        })),
      })
      const sample = await db.notification.findFirst({
        where: { alertId, type: 'LOST_PET_NEARBY', userId: recipients[0] },
        include: notificationInclude,
      })
      if (sample) {
        // O payload só muda no destinatário (id da notificação), que o cliente não usa para exibir
        realtime.toUsers(recipients, 'notification:new', toNotification(sample))
      }
    },

    async petSighted(input: {
      ownerId: string
      reporterId: string | null
      petId: string
      alertId: string | null
      message: string
    }) {
      await create({
        userId: input.ownerId,
        actorId: input.reporterId,
        type: 'LOST_PET_SIGHTING',
        petId: input.petId,
        alertId: input.alertId ?? undefined,
        preview: input.message.slice(0, PREVIEW_LENGTH),
      })
    },

    async lostPetFound(alertId: string, ownerId: string, helperIds: string[]) {
      for (const userId of new Set(helperIds)) {
        await create({ userId, actorId: ownerId, type: 'LOST_PET_FOUND', alertId })
      }
    },

    async list(
      userId: string,
      query: z.output<typeof notificationsQuerySchema>,
    ): Promise<Page<Notification>> {
      const cursor = decodeCursor(query.cursor, isTimeCursor)
      const rows = await db.notification.findMany({
        where: {
          userId,
          ...(cursor && {
            OR: [
              { createdAt: { lt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }),
        },
        include: notificationInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toNotification),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async unreadCount(userId: string) {
      return { unread: await db.notification.count({ where: { userId, readAt: null } }) }
    },

    async readAll(userId: string) {
      await db.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      })
    },
  }
}
