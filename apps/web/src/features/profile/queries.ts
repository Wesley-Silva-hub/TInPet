import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Breed, LookupItem, Me, Pet } from '@tinpet/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { currentPosition } from '../../lib/geolocation'

export const myPetsKey = ['pets', 'mine'] as const

export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: () =>
      api<{ maritalStatuses: LookupItem[]; professions: LookupItem[]; breeds: Breed[] }>(
        '/lookups',
      ),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useMyPets() {
  return useQuery({ queryKey: myPetsKey, queryFn: () => api<Pet[]>('/pets/mine') })
}

/** Mutação que devolve o usuário atualizado e sincroniza o contexto de auth. */
function useMeMutation<T>(request: (input: T) => Promise<Me>) {
  const { setUser } = useAuth()
  return useMutation({ mutationFn: request, onSuccess: setUser })
}

export function useShareLocation() {
  return useMeMutation(async () =>
    api<Me>('/me/location', { method: 'PUT', body: await currentPosition() }),
  )
}

export function useClearLocation() {
  return useMeMutation(() => api<Me>('/me/location', { method: 'DELETE' }))
}

export function useUploadAvatar() {
  return useMeMutation((file: Blob) => api<Me>('/me/avatar', { method: 'PUT', file }))
}

export function useInvalidateMyPets() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: myPetsKey })
}
