import { messageInputSchema } from '@tinpet/shared'
import { z } from 'zod'
import type { AppDeps } from '../../shared/context'
import { AppError } from '../../shared/errors'
import type { RealtimeServer } from '../../shared/realtime'
import { createChatService } from './service'

const MAX_MESSAGES_PER_WINDOW = 10
const WINDOW_MS = 10_000

const sendSchema = messageInputSchema.extend({ matchId: z.uuid() })
const readSchema = z.object({ matchId: z.uuid() })

/** Eventos de chat via Socket.IO; mesmas regras de autorização da API HTTP. */
export function registerChatSocket(io: RealtimeServer, deps: AppDeps) {
  const service = createChatService(deps)

  io.on('connection', (socket) => {
    const user = socket.data.user
    let windowStart = Date.now()
    let sentInWindow = 0

    socket.on('message:send', async (payload, ack) => {
      if (typeof ack !== 'function') return
      const now = Date.now()
      if (now - windowStart > WINDOW_MS) {
        windowStart = now
        sentInWindow = 0
      }
      if (++sentInWindow > MAX_MESSAGES_PER_WINDOW) {
        return ack({ ok: false, error: 'Muitas mensagens. Aguarde alguns segundos.' })
      }
      const parsed = sendSchema.safeParse(payload)
      if (!parsed.success) return ack({ ok: false, error: 'Mensagem inválida' })
      try {
        const message = await service.send(user, parsed.data.matchId, parsed.data.content)
        ack({ ok: true, message })
      } catch (error) {
        ack({ ok: false, error: error instanceof AppError ? error.message : 'Erro ao enviar' })
      }
    })

    socket.on('message:read', async (payload) => {
      const parsed = readSchema.safeParse(payload)
      if (!parsed.success) return
      await service.markRead(user, parsed.data.matchId).catch(() => undefined)
    })
  })
}
