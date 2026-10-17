import { useQueryClient } from '@tanstack/react-query'
import { MAX_CAPTION_LENGTH, type Post } from '@tinpet/shared'
import { ImagePlus, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { api, errorMessage } from '../../lib/api'
import { ACCEPTED_IMAGES, compressImage } from '../../lib/image'
import { useMyPets } from '../profile/queries'

export function NewPostPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pets = useMyPets()
  const fileInput = useRef<HTMLInputElement>(null)
  const captionId = useId()
  const petId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [pet, setPet] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const publish = async () => {
    if (!file) return
    setPublishing(true)
    try {
      await api<Post>('/posts', {
        method: 'POST',
        file: await compressImage(file, 1440),
        fields: { caption, petId: pet || null },
      })
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Publicado! 🐾')
      navigate('/inicio')
    } catch (error) {
      toast.error(errorMessage(error))
      setPublishing(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader title="Nova publicação" />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-card bg-surface-2"
          >
            <img
              src={preview}
              alt="Prévia da foto escolhida"
              className="aspect-[4/5] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 font-semibold text-white backdrop-blur"
            >
              <RefreshCw className="size-4" aria-hidden /> Trocar foto
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="picker"
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInput.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-brand-200 bg-surface text-brand-600"
          >
            <ImagePlus className="size-14" aria-hidden />
            <span className="text-lg font-semibold">Escolher foto</span>
            <span className="text-sm text-muted">Você com seu pet, um passeio, uma soneca…</span>
          </motion.button>
        )}
      </AnimatePresence>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const chosen = event.target.files?.[0]
          if (chosen) setFile(chosen)
          event.target.value = ''
        }}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={captionId} className="text-sm font-semibold">
          Legenda
        </label>
        <textarea
          id={captionId}
          rows={3}
          value={caption}
          maxLength={MAX_CAPTION_LENGTH}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Conte a história dessa foto…"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none"
        />
        <p className="self-end text-xs text-muted">
          {caption.length}/{MAX_CAPTION_LENGTH}
        </p>
      </div>

      {Boolean(pets.data?.length) && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={petId} className="text-sm font-semibold">
            Marcar pet
          </label>
          <select
            id={petId}
            value={pet}
            onChange={(event) => setPet(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <option value="">Nenhum</option>
            {pets.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button onClick={publish} disabled={!file} loading={publishing}>
        Publicar
      </Button>
    </div>
  )
}
