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

const notificationInclude = {
  actor: { select: { id: true, name: true, avatarKey: true } },
  post: { select: { imageKey: true } },
} satisfies Prisma.NotificationInclude

type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>

/**
 * Cria avisos e os entrega em tempo real. Nunca avisa a pessoa da própria ação, e curtir/descurtir
 * repetidamente não gera avisos duplicados.
 */
export function createNotifier({ db, storage, realtime }: AppDeps) {
  const toNotification = (row: NotificationRow): Notification => ({
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
    preview: row.preview,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  })

  async function create(data: {
    userId: string
    actorId: string
    type: NotificationType
    postId?: string
    matchId?: string
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
