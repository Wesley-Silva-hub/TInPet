import { useQuery } from '@tanstack/react-query'
import {
  RANKING_DAYS,
  RANKING_RADIUS_KM,
  type RankedPet,
  type Ranking,
  type Species,
  speciesLabels,
} from '@tinpet/shared'
import { Heart, Trophy } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'

const medals = ['🥇', '🥈', '🥉']
const filters: (Species | undefined)[] = [undefined, 'DOG', 'CAT', 'BIRD', 'RABBIT', 'RODENT']

export function useRanking(species?: Species) {
  return useQuery({
    queryKey: ['ranking', species ?? 'todos'],
    queryFn: () => api<Ranking>('/ranking', { query: { species } }),
    staleTime: 5 * 60_000,
  })
}

function PetPhoto({ item, className }: { item: RankedPet; className: string }) {
  return item.pet.photoUrl ? (
    <img src={item.pet.photoUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-brand-100 text-3xl`} aria-hidden>
      🐾
    </span>
  )
}

const likesText = (likes: number) =>
  `${likes.toLocaleString('pt-BR')} ${likes === 1 ? 'curtida' : 'curtidas'}`

/** Pódio dos três primeiros: o 1º no meio e mais alto. */
function Podium({ items }: { items: RankedPet[] }) {
  const reduceMotion = useReducedMotion()
  const order = [items[1], items[0], items[2]].filter(Boolean) as RankedPet[]
  const heights: Record<number, string> = { 1: 'h-28', 2: 'h-20', 3: 'h-14' }
  return (
    <ol className="flex items-end justify-center gap-3 pt-4" aria-label="Pódio">
      {order.map((item) => (
        <motion.li
          key={item.pet.id}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (3 - item.position) * 0.12 }}
          className="flex w-28 flex-col items-center gap-2"
        >
          <Link
            to={`/pets/${item.pet.id}`}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="text-3xl" aria-hidden>
              {medals[item.position - 1]}
            </span>
            <PetPhoto
              item={item}
              className={`rounded-full border-4 border-surface shadow-lg ${item.position === 1 ? 'size-24' : 'size-20'}`}
            />
            <span className="font-display text-lg leading-tight font-semibold">
              {item.pet.name}
            </span>
            <span className="text-xs text-muted">{likesText(item.likes)}</span>
          </Link>
          <span
            className={`w-full rounded-t-2xl bg-brand-100 dark:bg-surface-2 ${heights[item.position]}`}
            aria-hidden
          />
        </motion.li>
      ))}
    </ol>
  )
}

export function RankingPage() {
  const [species, setSpecies] = useState<Species | undefined>()
  const ranking = useRanking(species)
  const items = ranking.data?.items ?? []

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageHeader title="Ranking da região" />
      <p className="-mt-3 text-muted">
        Os pets mais curtidos nos últimos {RANKING_DAYS} dias
        {ranking.data?.scope === 'everywhere'
          ? '. Ative a localização no perfil para ver só a sua região.'
          : `, num raio de ${RANKING_RADIUS_KM} km de você.`}
      </p>
      <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <legend className="sr-only">Espécie</legend>
        {filters.map((value) => (
          <button
            key={value ?? 'todos'}
            type="button"
            aria-pressed={species === value}
            onClick={() => setSpecies(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              species === value ? 'bg-ink text-canvas' : 'bg-surface-2 text-muted hover:text-ink'
            }`}
          >
            {value ? speciesLabels[value] : 'Todos'}
          </button>
        ))}
      </fieldset>
      {ranking.isPending ? (
        <LoadingState />
      ) : ranking.isError ? (
        <ErrorState error={ranking.error} onRetry={() => ranking.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Trophy className="size-8" />} title="Ninguém pontuou ainda">
          Publique fotos marcando o seu pet: cada curtida conta para o ranking.
        </EmptyState>
      ) : (
        <>
          <Podium items={items.slice(0, 3)} />
          <ol className="flex flex-col gap-2">
            {items.slice(3).map((item) => (
              <li key={item.pet.id}>
                <Link
                  to={`/pets/${item.pet.id}`}
                  className={`flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-surface-2 ${
                    item.isMine ? 'bg-brand-50 dark:bg-surface-2' : ''
                  }`}
                >
                  <span className="w-7 text-center font-display text-lg font-semibold text-muted">
                    {item.position}
                  </span>
                  <PetPhoto item={item} className="size-12 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {item.pet.name}
                      {item.isMine && <span className="ml-1 text-xs text-brand-600">(seu)</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[
                        item.pet.breed ?? speciesLabels[item.pet.species],
                        item.owner.name.split(' ')[0],
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {item.distanceKm !== null && ` · ${item.distanceKm} km`}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                    <Heart className="size-4 fill-brand-500 text-brand-500" aria-hidden />
                    {item.likes.toLocaleString('pt-BR')}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

/** Prévia no Início: os 3 primeiros e o link para o ranking completo. */
export function RankingTeaser() {
  const ranking = useRanking()
  const top = ranking.data?.items.slice(0, 3) ?? []
  if (top.length === 0) return null
  return (
    <Link
      to="/ranking"
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:shadow-md"
    >
      <Trophy className="size-8 shrink-0 text-sun-400" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Ranking da região</span>
        <span className="block truncate text-sm text-muted">
          {top.map((item) => `${medals[item.position - 1]} ${item.pet.name}`).join('  ')}
        </span>
      </span>
      <span className="flex -space-x-3">
        {top.map((item) => (
          <PetPhoto
            key={item.pet.id}
            item={item}
            className="size-10 rounded-full border-2 border-surface"
          />
        ))}
      </span>
    </Link>
  )
}
