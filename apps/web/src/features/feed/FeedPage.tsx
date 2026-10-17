import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FeedItem, MatchSummary, Page, Pet, SwipeResult } from '@tinpet/shared'
import { Heart, MapPin, PawPrint, SearchX, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { matchesKey } from '../../routes/useRealtime'
import { useMyPets } from '../profile/queries'
import {
  activeFilterCount,
  type FeedFilters,
  FiltersButton,
  FiltersSheet,
  filtersToQuery,
  loadFilters,
  saveFilters,
} from './FeedFilters'
import { SwipeCard } from './SwipeCard'

const SELECTED_PET_KEY = 'tinpet:feed-pet'

function readSelectedPet(): string | null {
  try {
    return localStorage.getItem(SELECTED_PET_KEY)
  } catch {
    return null
  }
}

export function FeedPage() {
  const pets = useMyPets()
  const [selected, setSelected] = useState(readSelectedPet)

  if (pets.isPending) return <LoadingState />
  if (pets.isError) return <ErrorState error={pets.error} onRetry={() => pets.refetch()} />

  const active = pets.data.filter((pet) => pet.isActive)
  if (active.length === 0) {
    return (
      <EmptyState icon={<PawPrint className="size-8" />} title="Cadastre um pet para começar">
        <p>O feed mostra pets compatíveis com o seu.</p>
        <Link to="/pets/novo" className="mt-4 inline-block font-semibold text-brand-600 underline">
          Cadastrar pet
        </Link>
      </EmptyState>
    )
  }
  const pet = active.find((item) => item.id === selected) ?? (active[0] as Pet)

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {active.length > 1 && (
        <label className="flex items-center gap-2 self-center rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow-sm">
          Procurando como
          <select
            value={pet.id}
            onChange={(event) => {
              setSelected(event.target.value)
              try {
                localStorage.setItem(SELECTED_PET_KEY, event.target.value)
              } catch {
                // Preferência opcional; segue sem salvar
              }
            }}
            className="rounded-full bg-surface-2 px-2 py-1"
          >
            {active.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <PetDeck key={pet.id} pet={pet} />
    </div>
  )
}

/** Filtros do pet selecionado; mudar os filtros recomeça o baralho. */
function PetDeck({ pet }: { pet: Pet }) {
  const [filters, setFilters] = useState(() => loadFilters(pet.id))
  const [open, setOpen] = useState(false)
  const closeSheet = useCallback(() => setOpen(false), [])
  return (
    <>
      <div className="flex justify-end">
        <FiltersButton count={activeFilterCount(filters)} onClick={() => setOpen(true)} />
      </div>
      <Deck key={JSON.stringify(filters)} pet={pet} filters={filters} />
      <FiltersSheet
        open={open}
        value={filters}
        onClose={closeSheet}
        onApply={(next) => {
          setFilters(next)
          saveFilters(pet.id, next)
        }}
      />
    </>
  )
}

function Deck({ pet, filters }: { pet: Pet; filters: FeedFilters }) {
  const me = useMe()
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<'LIKE' | 'PASS' | null>(null)
  const [match, setMatch] = useState<MatchSummary | null>(null)

  const feed = useInfiniteQuery({
    queryKey: ['feed', pet.id, filters],
    queryFn: ({ pageParam }) =>
      api<Page<FeedItem>>('/feed', {
        query: { petId: pet.id, cursor: pageParam, limit: 10, ...filtersToQuery(filters) },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const items = feed.data?.pages.flatMap((page) => page.items) ?? []
  const current = items[index]

  useEffect(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage && index >= items.length - 3)
      feed.fetchNextPage()
  }, [index, items.length, feed])

  const swipe = useMutation({
    mutationFn: (input: { toPetId: string; direction: 'LIKE' | 'PASS' }) =>
      api<SwipeResult>('/swipes', { method: 'POST', body: { fromPetId: pet.id, ...input } }),
    onSuccess: ({ match: created }) => {
      if (created) {
        setMatch(created)
        queryClient.invalidateQueries({ queryKey: matchesKey })
      }
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const decide = useCallback(
    (direction: 'LIKE' | 'PASS', animate: boolean) => {
      if (!current || leaving) return
      swipe.mutate({ toPetId: current.pet.id, direction })
      const advance = () => {
        setLeaving(null)
        setIndex((value) => value + 1)
      }
      if (animate) {
        setLeaving(direction)
        window.setTimeout(advance, 200)
      } else {
        advance()
      }
    },
    [current, leaving, swipe],
  )

  // Teclado: ← passa, → curte
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (match || (event.target as HTMLElement).closest('input,select,textarea')) return
      if (event.key === 'ArrowRight') decide('LIKE', true)
      if (event.key === 'ArrowLeft') decide('PASS', true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, match])

  if (feed.isPending) return <LoadingState label="Procurando pets por perto…" />
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => feed.refetch()} />

  return (
    <>
      {!me.hasLocation && (
        <Link
          to="/perfil"
          className="flex items-center gap-2 rounded-2xl bg-sun-400/20 px-4 py-3 text-sm font-semibold"
        >
          <MapPin className="size-5 shrink-0" aria-hidden />
          Ative sua localização para ver pets por perto e a distância deles.
        </Link>
      )}

      <div className="relative aspect-[3/4] w-full">
        {current ? (
          <>
            {items[index + 1] && (
              <div
                className="absolute inset-0 scale-95 overflow-hidden rounded-card bg-surface-2 opacity-70"
                aria-hidden
              >
                {items[index + 1]?.pet.photos[0] && (
                  <img
                    src={items[index + 1]?.pet.photos[0]?.url}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>
            )}
            <SwipeCard
              key={current.pet.id}
              item={current}
              leaving={leaving}
              onSwipe={(direction) => decide(direction, false)}
            />
          </>
        ) : feed.isFetchingNextPage ? (
          <LoadingState />
        ) : (
          <EmptyState icon={<SearchX className="size-8" />} title="Por enquanto é só!">
            Você já viu todos os pets compatíveis por perto. Volte mais tarde ou aumente seu raio
            ativando a localização.
          </EmptyState>
        )}
      </div>

      {current && (
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => decide('PASS', true)}
            aria-label={`Passar ${current.pet.name} (seta para a esquerda)`}
            className="grid size-16 place-items-center rounded-full border border-line bg-surface text-brand-600 shadow-md transition hover:scale-105"
          >
            <X className="size-8" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => decide('LIKE', true)}
            aria-label={`Curtir ${current.pet.name} (seta para a direita)`}
            className="grid size-20 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 transition hover:scale-105"
          >
            <Heart className="size-9 fill-current" aria-hidden />
          </button>
        </div>
      )}

      {match && <MatchDialog match={match} onClose={() => setMatch(null)} />}
    </>
  )
}

function MatchDialog({ match, onClose }: { match: MatchSummary; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 grid place-items-center bg-brand-700/85 p-6 backdrop-blur-sm"
    >
      <div className="flex max-w-sm flex-col items-center gap-5 text-center text-white">
        <h2 id="match-title" className="font-display text-5xl font-bold">
          Deu match!
        </h2>
        <p>
          {match.myPet.name} e {match.otherPet.name} se curtiram. Que tal conversar com{' '}
          {match.otherOwner.name.split(' ')[0]}?
        </p>
        <div className="flex -space-x-4">
          <Avatar
            src={match.myPet.photos[0]?.url}
            name={match.myPet.name}
            className="size-28 ring-4 ring-white"
          />
          <Avatar
            src={match.otherPet.photos[0]?.url}
            name={match.otherPet.name}
            className="size-28 ring-4 ring-white"
          />
        </div>
        <Link
          to={`/matches/${match.id}`}
          autoFocus
          className="w-full rounded-full bg-white px-5 py-3 font-semibold text-brand-700"
        >
          Mandar mensagem
        </Link>
        <button type="button" onClick={onClose} className="font-semibold underline">
          Continuar descobrindo
        </button>
      </div>
    </div>
  )
}
