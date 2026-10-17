import type { Message, messagesQuerySchema, Page } from '@tinpet/shared'
import type { z } from 'zod'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor } from '../../shared/dto'
import { notFound } from '../../shared/errors'
import { activeMatchOf } from '../matching/service'

interface MessageCursor {
  t: string
  id: string
}
const isMessageCursor = (value: unknown): value is MessageCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MessageCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as MessageCursor).t)) &&
  typeof (value as MessageCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as MessageCursor).id)

const toMessage = (message: {
  id: string
  matchId: string
  senderId: string
  content: string
  createdAt: Date
  readAt: Date | null
}): Message => ({
  id: message.id,
  matchId: message.matchId,
  senderId: message.senderId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
  readAt: message.readAt?.toISOString() ?? null,
})

export function createChatService({ db, realtime }: AppDeps) {
  /** Só participantes de um match ativo (sem unmatch nem bloqueio) acessam a conversa. */
  async function participantIds(user: AuthUser, matchId: string): Promise<[string, string]> {
    const match = await db.match.findFirst({
      where: { id: matchId, ...activeMatchOf(user.id) },
      select: { petA: { select: { ownerId: true } }, petB: { select: { ownerId: true } } },
    })
    if (!match) throw notFound('Conversa')
    return [match.petA.ownerId, match.petB.ownerId]
  }

  return {
    /** Histórico do mais recente para o mais antigo, paginado por cursor. */
    async list(
      user: AuthUser,
      matchId: string,
      query: z.output<typeof messagesQuerySchema>,
    ): Promise<Page<Message>> {
      await participantIds(user, matchId)
      const cursor = decodeCursor(query.cursor, isMessageCursor)
      const rows = await db.message.findMany({
        where: {
          matchId,
          ...(cursor && {
            OR: [
              { createdAt: { lt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toMessage),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async send(user: AuthUser, matchId: string, content: string): Promise<Message> {
      const owners = await participantIds(user, matchId)
      const message = toMessage(
        await db.message.create({ data: { matchId, senderId: user.id, content } }),
      )
      realtime.toUsers(owners, 'message:new', message)
      return message
    },

    async markRead(user: AuthUser, matchId: string) {
      const owners = await participantIds(user, matchId)
      const readAt = new Date()
      const { count } = await db.message.updateMany({
        where: { matchId, senderId: { not: user.id }, readAt: null },
        data: { readAt },
      })
      if (count > 0) {
        realtime.toUsers(owners, 'message:read', {
          matchId,
          readerId: user.id,
          readAt: readAt.toISOString(),
        })
      }
    },
  }
}
