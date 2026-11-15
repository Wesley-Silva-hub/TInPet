import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Species, Walk, Walker } from '@tinpet/shared'
import { toast } from 'sonner'
import { api, errorMessage } from '../../lib/api'

export const walkersKey = ['walkers'] as const
export const walksKey = ['walks'] as const

export function useWalkers(species?: Species) {
  return useQuery({
    queryKey: [...walkersKey, species ?? 'todas'],
    queryFn: () => api<Walker[]>('/walkers', { query: { species } }),
  })
}

export function useWalker(id: string) {
  return useQuery({ queryKey: [...walkersKey, id], queryFn: () => api<Walker>(`/walkers/${id}`) })
}

export function useMyWalkerProfile() {
  return useQuery({
    queryKey: [...walkersKey, 'me'],
    queryFn: () => api<Walker | null>('/walkers/me'),
  })
}

export function useWalks() {
  return useQuery({ queryKey: walksKey, queryFn: () => api<Walk[]>('/walks') })
}

const messages = {
  accept: 'Passeio confirmado! O tutor foi avisado.',
  decline: 'Pedido recusado. O tutor foi avisado.',
  cancel: 'Passeio cancelado. A outra pessoa foi avisada.',
  done: 'Passeio marcado como feito.',
} as const

export function useWalkAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string
      action: keyof typeof messages
      note?: string
    }) =>
      api<Walk>(`/walks/${id}/${action}`, {
        method: 'POST',
        body: action === 'accept' || action === 'decline' ? { note: note ?? '' } : undefined,
      }),
    onSuccess: (_walk, { action }) => {
      toast.success(messages[action])
      queryClient.invalidateQueries({ queryKey: walksKey })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

const dayTime = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
export const walkWhen = (iso: string) => dayTime.format(new Date(iso))
