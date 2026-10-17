import { type FeedItem, purposeLabels, sexLabels, sizeLabels } from '@tinpet/shared'
import { MapPin } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'

const SWIPE_THRESHOLD = 110

export function petAge(birthDate: string | null): string | null {
  if (!birthDate) return null
  const months = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (30.44 * 24 * 3600 * 1000),
  )
  if (months < 12) return `${Math.max(months, 1)} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

interface SwipeCardProps {
  item: FeedItem
  /** Saída animada disparada por botão/teclado (o gesto cuida da própria animação). */
  leaving: 'LIKE' | 'PASS' | null
  onSwipe: (direction: 'LIKE' | 'PASS') => void
}

/** Cartão arrastável: pointer events cobrem mouse, toque e caneta. */
export function SwipeCard({ item, leaving, onSwipe }: SwipeCardProps) {
  const { pet, owner, distanceKm } = item
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const start = useRef<{ x: number; moved: boolean } | null>(null)

  const offset = leaving === 'LIKE' ? 600 : leaving === 'PASS' ? -600 : dx
  const photo = pet.photos[photoIndex] ?? pet.photos[0]
  const age = petAge(pet.birthDate)

  const showPhoto = (step: number) =>
    setPhotoIndex((index) => Math.min(pet.photos.length - 1, Math.max(0, index + step)))

  const finish = (event: ReactPointerEvent<HTMLElement>) => {
    if (!start.current) return
    const { moved } = start.current
    start.current = null
    setDragging(false)
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const direction = dx > 0 ? 'LIKE' : 'PASS'
      setDx(dx > 0 ? 600 : -600)
      window.setTimeout(() => onSwipe(direction), 180)
      return
    }
    setDx(0)
    // Toque sem arrastar: terço esquerdo volta a foto, terço direito avança
    if (!moved) {
      const box = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width
      if (x < 1 / 3) showPhoto(-1)
      else if (x > 2 / 3) showPhoto(1)
    }
  }

  return (
    <article
      aria-label={`${pet.name}${age ? `, ${age}` : ''}`}
      className="absolute inset-0 touch-none select-none overflow-hidden rounded-card bg-surface shadow-xl shadow-black/10"
      style={{
        transform: `translateX(${offset}px) rotate(${offset / 18}deg)`,
        transition: dragging ? 'none' : 'transform 220ms ease-out',
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('a,button')) return
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, moved: false }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const delta = event.clientX - start.current.x
        if (Math.abs(delta) > 6) start.current.moved = true
        setDx(delta)
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div className="relative h-full">
        {photo ? (
          <img
            src={photo.url}
            alt={`Foto de ${pet.name}`}
            draggable={false}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center bg-brand-100 text-7xl" aria-hidden>
            🐾
          </div>
        )}

        {pet.photos.length > 1 && (
          <>
            <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
              {pet.photos.map((p, index) => (
                <span
                  key={p.id}
                  className={`h-1 flex-1 rounded-full ${index === photoIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
            <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-6 focus-within:right-3 focus-within:flex focus-within:gap-2">
              <button
                type="button"
                className="rounded-full bg-black/60 px-3 py-1 text-white"
                onClick={() => showPhoto(-1)}
              >
                Foto anterior
              </button>
              <button
                type="button"
                className="rounded-full bg-black/60 px-3 py-1 text-white"
                onClick={() => showPhoto(1)}
              >
                Próxima foto
              </button>
            </div>
          </>
        )}

        <span
          aria-hidden
          className="absolute top-8 left-6 -rotate-12 rounded-xl border-4 border-leaf-500 px-3 py-1 font-display text-3xl font-bold text-leaf-500"
          style={{ opacity: Math.max(0, Math.min(1, offset / SWIPE_THRESHOLD)) }}
        >
          CURTI
        </span>
        <span
          aria-hidden
          className="absolute top-8 right-6 rotate-12 rounded-xl border-4 border-brand-500 px-3 py-1 font-display text-3xl font-bold text-brand-500"
          style={{ opacity: Math.max(0, Math.min(1, -offset / SWIPE_THRESHOLD)) }}
        >
          PASSO
        </span>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-5 pt-24 text-white">
          <h2 className="text-3xl font-semibold">
            {pet.name}
            {age && <span className="ml-2 text-xl font-normal opacity-90">{age}</span>}
          </h2>
          <p className="mt-1 text-sm opacity-90">
            {[pet.breed, sexLabels[pet.sex], sizeLabels[pet.size]].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1">{purposeLabels[pet.purpose]}</span>
            {distanceKm !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                <MapPin className="size-3.5" aria-hidden /> a {distanceKm} km
              </span>
            )}
          </div>
          {pet.bio && <p className="mt-3 line-clamp-2">{pet.bio}</p>}
          <Link
            to={`/usuarios/${owner.id}`}
            className="pointer-events-auto mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-1 text-sm font-semibold hover:bg-white/25"
          >
            <Avatar src={owner.avatarUrl} name={owner.name} className="size-7" />
            Tutor(a): {owner.name.split(' ')[0]}, {owner.age}
          </Link>
        </div>
      </div>
    </article>
  )
}
