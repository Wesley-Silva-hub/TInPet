import { type InfiniteData, useQueryClient } from '@tanstack/react-query'
import type { Message, Page } from '@tinpet/shared'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { notificationsKey, unreadKey } from '../features/notifications/queries'
import { connectSocket, disconnectSocket } from '../lib/socket'

export const matchesKey = ['matches'] as const
export const messagesKey = (matchId: string) => ['messages', matchId] as const

/** Liga o Socket.IO e mantém o cache do React Query em dia com eventos do servidor. */
export function useRealtime(enabled: boolean) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!enabled) return
    const socket = connectSocket()

    socket.on('match:new', (match) => {
      queryClient.invalidateQueries({ queryKey: matchesKey })
      toast.success(`Deu match! ${match.myPet.name} e ${match.otherPet.name} 💛`, {
        action: { label: 'Conversar', onClick: () => navigate(`/matches/${match.id}`) },
      })
    })

    socket.on('message:new', (message) => {
      queryClient.setQueryData<InfiniteData<Page<Message>>>(
        messagesKey(message.matchId),
        (data) => {
          if (!data) return data
          const [first, ...rest] = data.pages
          if (!first || first.items.some((item) => item.id === message.id)) return data
          return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] }
        },
      )
      queryClient.invalidateQueries({ queryKey: matchesKey })
    })

    socket.on('notification:new', () => {
      queryClient.setQueryData<{ unread: number }>(unreadKey, (data) => ({
        unread: (data?.unread ?? 0) + 1,
      }))
      queryClient.invalidateQueries({ queryKey: notificationsKey })
    })

    socket.on('message:read', ({ matchId }) => {
      queryClient.invalidateQueries({ queryKey: messagesKey(matchId) })
      queryClient.invalidateQueries({ queryKey: matchesKey })
    })

    return () => disconnectSocket()
  }, [enabled, queryClient, navigate])
}
