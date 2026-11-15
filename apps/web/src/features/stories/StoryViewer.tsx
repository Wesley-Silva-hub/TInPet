import type { StoryGroup } from '@tinpet/shared'
import { ChevronLeft, ChevronRight, Eye, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { timeAgo } from '../../lib/time'
import { useDeleteStory, useMarkStoryViewed } from './queries'

/** Tempo de cada foto antes de passar para a próxima. */
const STORY_MS = 5_000

interface StoryViewerProps {
  groups: StoryGroup[]
  startGroup: number
  onClose: () => void
}

/** Visualizador em tela cheia: toque nas laterais (ou setas) navega, Esc fecha, pausa ao segurar. */
export function StoryViewer({ groups, startGroup, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroup)
  const [itemIndex, setItemIndex] = useState(() =>
    Math.max(
      0,
      (groups[startGroup]?.items ?? []).findIndex((item) => !item.seen),
    ),
  )
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const markViewed = useMarkStoryViewed()
  const deleteStory = useDeleteStory()
  const dialog = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)

  const group = groups[groupIndex]
  const story = group?.items[itemIndex]

  const next = useCallback(() => {
    if (!group) return
    if (itemIndex < group.items.length - 1) setItemIndex(itemIndex + 1)
    else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1)
      setItemIndex(0)
    } else onClose()
  }, [group, itemIndex, groupIndex, groups.length, onClose])

  const previous = useCallback(() => {
    if (itemIndex > 0) setItemIndex(itemIndex - 1)
    else if (groupIndex > 0) {
      const before = groups[groupIndex - 1]
      setGroupIndex(groupIndex - 1)
      setItemIndex(Math.max(0, (before?.items.length ?? 1) - 1))
    }
  }, [itemIndex, groupIndex, groups])

  const storyId = story?.id
  const shouldMark = Boolean(story && group && !group.isMine && !story.seen)

  // Nova foto: zera o tempo e conta como vista (o próprio autor não conta)
  useEffect(() => {
    elapsed.current = 0
    setProgress(0)
    if (storyId && shouldMark) markViewed(storyId)
  }, [storyId, shouldMark, markViewed])

  // Avança sozinho; segurar o dedo pausa e continua de onde parou
  useEffect(() => {
    if (paused || !storyId) return
    const startedAt = performance.now() - elapsed.current
    let frame = 0
    const tick = (now: number) => {
      elapsed.current = now - startedAt
      const value = Math.min(1, elapsed.current / STORY_MS)
      setProgress(value)
      if (value >= 1) next()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, storyId, next])

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, previous, onClose])

  if (!group || !story) return null

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Stories de ${group.author.name}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black outline-none"
    >
      <div className="relative flex h-full w-full max-w-md flex-col">
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.items.map((item, index) => (
              <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full bg-white"
                  style={{
                    width: `${index < itemIndex ? 100 : index === itemIndex ? progress * 100 : 0}%`,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            <Avatar src={group.author.avatarUrl} name={group.author.name} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {group.isMine ? 'Seu story' : group.author.name}
                {story.pet && <span className="font-normal opacity-80"> · {story.pet.name}</span>}
              </p>
              <p className="text-xs opacity-80">{timeAgo(story.createdAt)}</p>
            </div>
            {group.isMine && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Apagar este story?')) {
                    deleteStory.mutate(story.id)
                    onClose()
                  }
                }}
                aria-label="Apagar story"
                className="rounded-full p-2 hover:bg-white/15"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-2 hover:bg-white/15"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
        </div>

        <img
          src={story.imageUrl}
          alt={story.caption || `Story de ${group.author.name}`}
          className="h-full w-full object-contain"
        />

        {/* Áreas de toque: esquerda volta, direita avança; segurar pausa */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={previous}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          className="absolute inset-y-0 left-0 w-1/3"
        >
          <ChevronLeft className="sr-only" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Próximo"
          onClick={next}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          className="absolute inset-y-0 right-0 w-2/3"
        >
          <ChevronRight className="sr-only" aria-hidden />
        </button>

        {(story.caption || group.isMine) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
            {story.caption && <p className="text-center text-lg">{story.caption}</p>}
            {group.isMine && story.viewCount !== null && (
              <p className="flex items-center justify-center gap-1 text-sm opacity-90">
                <Eye className="size-4" aria-hidden /> {story.viewCount}{' '}
                {story.viewCount === 1 ? 'visualização' : 'visualizações'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
