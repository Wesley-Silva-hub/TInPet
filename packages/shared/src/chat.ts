import { z } from 'zod'
import { paginationQuerySchema } from './common'
import type { matchSummarySchema } from './matching'

export const MAX_MESSAGE_LENGTH = 2000

export const messageInputSchema = z.object({
  content: z.string().trim().min(1, 'Mensagem vazia').max(MAX_MESSAGE_LENGTH),
})
export type MessageInput = z.infer<typeof messageInputSchema>

export const messagesQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

export const messageSchema = z.object({
  id: z.uuid(),
  matchId: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
})
export type Message = z.infer<typeof messageSchema>

/** Eventos do Socket.IO (servidor → cliente e cliente → servidor). */
export interface ServerToClientEvents {
  'match:new': (match: z.infer<typeof matchSummarySchema>) => void
  'message:new': (message: Message) => void
  'message:read': (payload: { matchId: string; readerId: string; readAt: string }) => void
}

export interface ClientToServerEvents {
  'message:send': (
    payload: { matchId: string; content: string },
    ack: (result: { ok: true; message: Message } | { ok: false; error: string }) => void,
  ) => void
  'message:read': (payload: { matchId: string }) => void
}
