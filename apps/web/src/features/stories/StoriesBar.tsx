import type { StoryGroup } from '@tinpet/shared'
import { MAX_STORY_CAPTION } from '@tinpet/shared'
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useMe } from '../../lib/auth'
import { ACCEPTED_IMAGES } from '../../lib/image'
import { useMyPets } from '../profile/queries'
import { useCreateStory, useStories } from './queries'
import { StoryViewer } from './StoryViewer'

/** Anel colorido = tem story não visto; cinza = já viu tudo. */
function Ring({ group, children }: { group: StoryGroup; children: React.ReactNode }) {
  return (
    <span
      className={`block rounded-full p-[3px] ${
        group.allSeen && !group.isMine
          ? 'bg-line'
          : 'bg-linear-to-tr from-sun-400 via-brand-400 to-brand-600'
      }`}
    >
      <span className="block rounded-full border-2 border-canvas">{children}</span>
    </span>
  )
}

/** Prévia antes de publicar: legenda curta e o pet da foto. */
function StoryComposer({ file, onClose }: { file: File; onClose: () => void }) {
  const [caption, setCaption] = useState('')
  const [petId, setPetId] = useState('')
  const pets = useMyPets().data ?? []
  const create = useCreateStory()
  const [preview] = useState(() => URL.createObjectURL(file))
  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Novo story"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate(
            { file, caption: caption.trim(), petId: petId || null },
            { onSuccess: onClose },
          )
        }}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Novo story</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancelar"
            className="rounded-full p-2 hover:bg-white/15"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <img
          src={preview}
          alt="Prévia do story"
          className="max-h-[55dvh] w-full rounded-2xl object-contain"
        />
        <input
          value={caption}
          maxLength={MAX_STORY_CAPTION}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Escreva algo (opcional)"
          aria-label="Legenda"
          className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        {pets.length > 0 && (
          <select
            value={petId}
            onChange={(event) => setPetId(event.target.value)}
            aria-label="Pet da foto"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="" className="text-ink">
              Sem marcar pet
            </option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id} className="text-ink">
                {pet.name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" loading={create.isPending}>
          Publicar por 24 h
        </Button>
      </form>
    </div>
  )
}

/** Barra de stories do Início: o seu primeiro (com "+"), depois os não vistos. */
export function StoriesBar() {
  const me = useMe()
  const stories = useStories()
  const groups = stories.data ?? []
  const [open, setOpen] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const mine = groups.find((group) => group.isMine)
  const canPost = me.role === 'OWNER'

  if (!canPost && groups.length === 0) return null

  return (
    <section aria-label="Stories" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-4 pb-1">
        {canPost && (
          <li className="flex w-18 shrink-0 flex-col items-center gap-1">
            <span className="relative block">
              {mine ? (
                <button
                  type="button"
                  onClick={() => setOpen(groups.indexOf(mine))}
                  aria-label="Ver seu story"
                >
                  <Ring group={mine}>
                    <Avatar src={me.avatarUrl} name={me.name} className="size-16" />
                  </Ring>
                </button>
              ) : (
                <span className="block rounded-full p-[3px]">
                  <Avatar src={me.avatarUrl} name={me.name} className="size-16" />
                </span>
              )}
              <button
                type="button"
                onClick={() => input.current?.click()}
                aria-label="Adicionar story"
                className="absolute right-0 bottom-0 grid size-6 place-items-center rounded-full border-2 border-canvas bg-brand-500 text-white"
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </span>
            <span className="w-full truncate text-center text-xs">Seu story</span>
          </li>
        )}
        {groups.map((group, index) =>
          group.isMine ? null : (
            <li key={group.author.id} className="flex w-18 shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-label={`Stories de ${group.author.name}${group.allSeen ? '' : ', não vistos'}`}
              >
                <Ring group={group}>
                  <Avatar
                    src={group.author.avatarUrl}
                    name={group.author.name}
                    className="size-16"
                  />
                </Ring>
              </button>
              <span
                className={`w-full truncate text-center text-xs ${group.allSeen ? 'text-muted' : ''}`}
              >
                {group.author.name.split(' ')[0]}
              </span>
            </li>
          ),
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
          const chosen = event.target.files?.[0]
          if (chosen) setFile(chosen)
          event.target.value = ''
        }}
      />
      {file && <StoryComposer file={file} onClose={() => setFile(null)} />}
      {open !== null && (
        <StoryViewer groups={groups} startGroup={open} onClose={() => setOpen(null)} />
      )}
    </section>
  )
}
