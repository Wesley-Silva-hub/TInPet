import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notification, Page } from '@tinpet/shared'
import { api } from '../../lib/api'

export const unreadKey = ['notifications', 'unread'] as const
export const notificationsKey = ['notifications', 'list'] as const

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: unreadKey,
    queryFn: () => api<{ unread: number }>('/notifications/unread-count'),
    enabled,
    // O socket avisa na hora; o intervalo cobre reconexões perdidas
    refetchInterval: 120_000,
  })
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationsKey,
    queryFn: ({ pageParam }) =>
      api<Page<Notification>>('/notifications', { query: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useReadAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(unreadKey, { unread: 0 })
      queryClient.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}
