import { useQuery } from '@tanstack/react-query'
import {
  type Pet,
  type PublicUser,
  purposeLabels,
  sexLabels,
  sizeLabels,
  speciesLabels,
  vaccineStatusLabels,
} from '@tinpet/shared'
import { ArrowLeft, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { petAge } from '../feed/SwipeCard'
import { PostGrid } from '../social/PostGrid'

/** Galeria com deslize (scroll-snap) e indicadores clicáveis. */
function Gallery({ pet }: { pet: Pet }) {
  const [index, setIndex] = useState(0)
  if (pet.photos.length === 0) {
    return (
      <div
        className="grid aspect-[4/5] w-full place-items-center rounded-card bg-brand-100 text-8xl"
        aria-hidden
      >
        🐾
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-card">
      <ul
        className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(event) => {
          const element = event.currentTarget
          setIndex(Math.round(element.scrollLeft / element.clientWidth))
        }}
      >
        {pet.photos.map((photo, position) => (
          <li key={photo.id} className="w-full shrink-0 snap-center">
            <img
              src={photo.url}
              alt={`Foto ${position + 1} de ${pet.name}`}
              className="size-full object-cover"
              loading={position === 0 ? 'eager' : 'lazy'}
            />
          </li>
        ))}
      </ul>
      {pet.photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {pet.photos.map((photo, position) => (
            <span
              key={photo.id}
              aria-hidden
              className={`h-1.5 rounded-full bg-white shadow transition-all ${position === index ? 'w-6' : 'w-1.5 opacity-60'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function PetProfilePage() {
  const { id } = useParams() as { id: string }
  const me = useMe()
  const navigate = useNavigate()
  const pet = useQuery({ queryKey: ['pet', id], queryFn: () => api<Pet>(`/pets/${id}`) })
  const isMine = pet.data?.ownerId === me.id
  const owner = useQuery({
    queryKey: ['user', pet.data?.ownerId],
    queryFn: () => api<{ user: PublicUser }>(`/users/${pet.data?.ownerId}`),
    enabled: Boolean(pet.data && !isMine),
  })

  if (pet.isError) return <ErrorState error={pet.error} onRetry={() => pet.refetch()} />
  if (pet.isPending) {
    return (
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }
  const data = pet.data
  const age = petAge(data.birthDate)
  const vaccinated = data.vaccineStatus === 'UP_TO_DATE' || data.vaccineStatus === 'DUE_SOON'
  const facts = [
    speciesLabels[data.species],
    data.breed,
    sexLabels[data.sex],
    `Porte ${sizeLabels[data.size].toLowerCase()}`,
    age,
  ].filter(Boolean)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <Gallery pet={data} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-4xl font-semibold">{data.name}</h1>
            {isMine && (
              <Link
                to={`/pets/${data.id}/editar`}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2"
              >
                <Pencil className="size-4" aria-hidden /> Editar
              </Link>
            )}
          </div>
          <p className="text-lg text-muted">{facts.join(' · ')}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
              {purposeLabels[data.purpose]}
            </span>
            {data.vaccineStatus !== 'NONE' && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  vaccinated
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                }`}
              >
                {vaccinated ? (
                  <ShieldCheck className="size-4" aria-hidden />
                ) : (
                  <ShieldAlert className="size-4" aria-hidden />
                )}
                {vaccineStatusLabels[data.vaccineStatus]}
              </span>
            )}
            {!data.isActive && (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-muted">
                Oculto no Descobrir
              </span>
            )}
          </div>
          {data.bio && <p className="whitespace-pre-line text-lg">{data.bio}</p>}

          {owner.data && (
            <Link
              to={`/usuarios/${owner.data.user.id}`}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:bg-surface-2"
            >
              <Avatar
                src={owner.data.user.avatarUrl}
                name={owner.data.user.name}
                className="size-14"
              />
              <span>
                <span className="block text-sm text-muted">Tutor(a)</span>
                <span className="block font-semibold">
                  {owner.data.user.name}, {owner.data.user.age}
                </span>
                {owner.data.user.city && (
                  <span className="block text-sm text-muted">{owner.data.user.city}</span>
                )}
              </span>
            </Link>
          )}
        </motion.div>
      </div>

      <section aria-labelledby="fotos-pet" className="flex flex-col gap-3">
        <h2 id="fotos-pet" className="text-lg font-semibold">
          Aparece nestas publicações
        </h2>
        <PostGrid petId={data.id} emptyText={`Ainda não há publicações com ${data.name}.`} />
      </section>
    </div>
  )
}
