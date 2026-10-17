import type { Server as HttpServer } from 'node:http'
import type { ClientToServerEvents, ServerToClientEvents } from '@tinpet/shared'
import { Server } from 'socket.io'
import type { AuthUser, TokenService } from './auth'

export const SOCKET_PATH = '/api/socket.io'

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { user: AuthUser }
>

const userRoom = (userId: string) => `user:${userId}`

export interface Realtime {
  toUsers<E extends keyof ServerToClientEvents>(
    userIds: string[],
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void
}

/** Socket.IO na própria API, autenticado com o mesmo access token do HTTP. */
export function createRealtime(
  server: HttpServer,
  tokens: TokenService,
  corsOrigins: string[],
): { io: RealtimeServer; realtime: Realtime } {
  const io: RealtimeServer = new Server(server, {
    path: SOCKET_PATH,
    cors: { origin: corsOrigins },
    serveClient: false,
    maxHttpBufferSize: 16 * 1024,
  })

  io.use(async (socket, next) => {
    const token: unknown = socket.handshake.auth.token
    if (typeof token !== 'string') return next(new Error('UNAUTHORIZED'))
    try {
      socket.data.user = await tokens.verify(token)
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user.id))
  })

  return {
    io,
    realtime: {
      toUsers(userIds, event, ...args) {
        io.to(userIds.map(userRoom)).emit(event, ...args)
      },
    },
  }
}
