import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PetEvent, PetEventDetail } from '@tinpet/shared'
import { toast } from 'sonner'
import { api, errorMessage } from '../../lib/api'

export const eventsKey = ['events'] as const

export function useEvents() {
  return useQuery({
    queryKey: eventsKey,
    queryFn: () => api<PetEvent[]>('/events'),
    staleTime: 60_000,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: [...eventsKey, id],
    queryFn: () => api<PetEventDetail>(`/events/${id}`),
  })
}

/** Confirmar/desfazer presença e cancelar: todas devolvem o evento atualizado. */
export function useEventAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'attend' | 'unattend' | 'cancel') =>
      api<PetEventDetail>(`/events/${id}/${action === 'cancel' ? 'cancel' : 'attend'}`, {
        method: action === 'unattend' ? 'DELETE' : 'POST',
      }),
    onSuccess: (event, action) => {
      queryClient.setQueryData([...eventsKey, id], event)
      queryClient.invalidateQueries({ queryKey: eventsKey, exact: true })
      const messages = {
        attend: 'Presença confirmada! Até lá 🐾',
        unattend: 'Tudo bem, presença desfeita',
        cancel: 'Evento cancelado. Quem ia foi avisado.',
      }
      toast.success(messages[action])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const timeOnly = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "sáb., 21 de nov., 16:00 – 18:00" (o fim só mostra a hora se for no mesmo dia). */
export function eventWhen(event: Pick<PetEvent, 'startsAt' | 'endsAt'>): string {
  const start = new Date(event.startsAt)
  if (!event.endsAt) return dateTime.format(start)
  const end = new Date(event.endsAt)
  const sameDay = start.toDateString() === end.toDateString()
  return `${dateTime.format(start)} – ${sameDay ? timeOnly.format(end) : dateTime.format(end)}`
}

/** Compartilha pelo menu nativo do celular; sem ele, copia o texto com o link. */
export async function shareEvent(event: PetEvent): Promise<'shared' | 'copied'> {
  const url = `${window.location.origin}/eventos/${event.id}`
  const text = `🐾 ${event.title} — ${eventWhen(event)} em ${event.place}. Bora?`
  if (navigator.share) {
    await navigator.share({ title: event.title, text, url })
    return 'shared'
  }
  await navigator.clipboard.writeText(`${text} ${url}`)
  return 'copied'
}
