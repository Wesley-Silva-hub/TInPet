import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StoryGroup } from '@tinpet/shared'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../../lib/api'
import { compressImage } from '../../lib/image'

export const storiesKey = ['stories'] as const

export function useStories() {
  return useQuery({
    queryKey: storiesKey,
    queryFn: () => api<StoryGroup[]>('/stories'),
    staleTime: 60_000,
  })
}

export function useCreateStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { file: File; caption: string; petId: string | null }) =>
      api('/stories', {
        method: 'POST',
        file: await compressImage(input.file, 1440),
        fields: { caption: input.caption, petId: input.petId },
      }),
    onSuccess: () => {
      toast.success('Story no ar por 24 h.')
      queryClient.invalidateQueries({ queryKey: storiesKey })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

/** Marca como visto sem recarregar a barra a cada foto (atualiza o cache na hora). */
export function useMarkStoryViewed() {
  const queryClient = useQueryClient()
  return useCallback(
    (storyId: string) => {
      queryClient.setQueryData<StoryGroup[]>(storiesKey, (groups) =>
        groups?.map((group) => {
          const items = group.items.map((item) =>
            item.id === storyId ? { ...item, seen: true } : item,
          )
          return { ...group, items, allSeen: items.every((item) => item.seen) }
        }),
      )
      void api(`/stories/${storyId}/view`, { method: 'POST' }).catch(() => undefined)
    },
    [queryClient],
  )
}

export function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => api(`/stories/${storyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Story apagado')
      queryClient.invalidateQueries({ queryKey: storiesKey })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
