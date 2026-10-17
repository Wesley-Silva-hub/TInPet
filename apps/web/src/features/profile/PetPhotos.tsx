import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MAX_PET_PHOTOS, type Pet } from '@tinpet/shared'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Spinner } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { ACCEPTED_IMAGES, compressImage } from '../../lib/image'
import { myPetsKey } from './queries'

export function PetPhotos({ pet }: { pet: Pet }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)

  const onUpdated = (updated: Pet) => {
    queryClient.setQueryData(['pet', pet.id], updated)
    queryClient.invalidateQueries({ queryKey: myPetsKey })
  }
  const upload = useMutation({
    mutationFn: async (file: File) =>
      api<Pet>(`/pets/${pet.id}/photos`, { method: 'POST', file: await compressImage(file) }),
    onSuccess: onUpdated,
    onError: (error) => toast.error(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: (photoId: string) =>
      api<Pet>(`/pets/${pet.id}/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: onUpdated,
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <section aria-labelledby="fotos" className="flex flex-col gap-3">
      <h2 id="fotos" className="text-lg font-semibold">
        Fotos{' '}
        <span className="text-sm font-normal text-muted">
          ({pet.photos.length}/{MAX_PET_PHOTOS})
        </span>
      </h2>
      <ul className="grid grid-cols-3 gap-3">
        {pet.photos.map((photo, index) => (
          <li
            key={photo.id}
            className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2"
          >
            <img
              src={photo.url}
              alt={`Foto ${index + 1} de ${pet.name}`}
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove.mutate(photo.id)}
              disabled={remove.isPending}
              aria-label={`Remover foto ${index + 1}`}
              className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-black/60 text-white"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {pet.photos.length < MAX_PET_PHOTOS && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={upload.isPending}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 text-sm font-semibold text-brand-600"
            >
              {upload.isPending ? <Spinner /> : <ImagePlus className="size-7" aria-hidden />}
              Adicionar
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload.mutate(file)
          event.target.value = ''
        }}
      />
    </section>
  )
}
