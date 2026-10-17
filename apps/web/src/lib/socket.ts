import type { ClientToServerEvents, ServerToClientEvents } from '@tinpet/shared'
import { io, type Socket } from 'socket.io-client'
import { getAccessToken, refreshSession } from './api'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

/**
 * Conexão única com o Socket.IO da API. Em produção a API pode estar em outro domínio
 * (VITE_SOCKET_URL), pois rewrites da Vercel não encaminham WebSocket.
 */
export function connectSocket(): AppSocket {
  if (socket) return socket
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    path: '/api/socket.io',
    // Lido a cada (re)conexão, então sempre usa o token mais recente
    auth: (callback) => callback({ token: getAccessToken() }),
  })
  socket.on('connect_error', async (error) => {
    if (error.message === 'UNAUTHORIZED' && (await refreshSession())) socket?.connect()
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
