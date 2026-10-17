import { useQuery } from '@tanstack/react-query'
import type { LostPetAlertDetail, LostPetAlertSummary } from '@tinpet/shared'
import { api } from '../../lib/api'

export const lostPetsKey = ['lost-pets'] as const

export function useLostPets() {
  return useQuery({
    queryKey: lostPetsKey,
    queryFn: () => api<LostPetAlertSummary[]>('/lost-pets'),
    staleTime: 60_000,
  })
}

export function useLostPet(id: string) {
  return useQuery({
    queryKey: [...lostPetsKey, id],
    queryFn: () => api<LostPetAlertDetail>(`/lost-pets/${id}`),
  })
}

/** Compartilha pelo menu nativo do celular; sem ele, copia o texto com o link. */
export async function shareAlert(alert: LostPetAlertSummary): Promise<'shared' | 'copied'> {
  const url = `${window.location.origin}/perdidos/${alert.id}`
  const text = `🚨 ${alert.pet.name} está perdido perto de ${alert.neighborhood}. ${alert.description} Viu? Avise pelo TinPet:`
  if (navigator.share) {
    await navigator.share({ title: `${alert.pet.name} está perdido`, text, url })
    return 'shared'
  }
  await navigator.clipboard.writeText(`${text} ${url}`)
  return 'copied'
}
