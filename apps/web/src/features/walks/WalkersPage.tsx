import { formatPrice, type Walker, weekdayLabels } from '@tinpet/shared'
import { CalendarClock, Dog, MapPin, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useMyWalkerProfile, useWalkers } from './queries'

export const daysText = (days: number[]) =>
  days.length === 7 ? 'Todos os dias' : days.map((day) => weekdayLabels[day]).join(', ')

export const priceText = (cents: number) => (cents === 0 ? 'Voluntário' : formatPrice(cents))

function WalkerCard({ walker }: { walker: Walker }) {
  return (
    <li>
      <Link
        to={`/passeadores/${walker.id}`}
        className="flex gap-4 rounded-card border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Avatar src={walker.avatarUrl} name={walker.name} className="size-16" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-xl font-semibold">{walker.name}</span>
            <span className="font-semibold text-brand-600">
              {priceText(walker.priceCents)}
              <span className="text-sm font-normal text-muted"> / {walker.walkMinutes} min</span>
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {walker.neighborhoods || walker.city || 'Perto de você'}
              {walker.distanceKm !== null && ` · ${walker.distanceKm} km`}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden /> {daysText(walker.weekdays)}
            </span>
          </p>
          {walker.bio && <p className="line-clamp-2 text-sm">{walker.bio}</p>}
          {walker.completedWalks > 0 && (
            <p className="text-xs font-semibold text-leaf-500">
              {walker.completedWalks}{' '}
              {walker.completedWalks === 1 ? 'passeio feito' : 'passeios feitos'} pelo TinPet
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}

export function WalkersPage() {
  const walkers = useWalkers()
  const mine = useMyWalkerProfile()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader
        title="Passeadores"
        action={
          <Link
            to="/passeios"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 font-semibold hover:bg-surface-2"
          >
            Meus passeios
          </Link>
        }
      />
      <p className="-mt-3 text-muted">
        Tutores da vizinhança que passeiam com o seu pet. O pagamento vocês combinam direto.
      </p>
      <Link
        to="/passeadores/meu-perfil"
        className="flex items-center gap-3 rounded-card border-2 border-dashed border-brand-200 p-4 font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-surface-2"
      >
        <UserRoundPlus className="size-6 shrink-0" aria-hidden />
        {mine.data
          ? mine.data.active
            ? 'Editar meu perfil de passeador'
            : 'Meu perfil de passeador está pausado: reativar'
          : 'Quero ser passeador e ganhar uma renda extra'}
      </Link>
      {walkers.isPending ? (
        <LoadingState />
      ) : walkers.isError ? (
        <ErrorState error={walkers.error} onRetry={() => walkers.refetch()} />
      ) : walkers.data.length === 0 ? (
        <EmptyState icon={<Dog className="size-8" />} title="Nenhum passeador por perto ainda">
          Conhece alguém que ama passear com pets? Convide para o TinPet.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {walkers.data.map((walker) => (
            <WalkerCard key={walker.id} walker={walker} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Atalho no Início (no celular os passeadores não cabem no cabeçalho). */
export function WalkersTeaser() {
  return (
    <Link
      to="/passeadores"
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:shadow-md"
    >
      <Dog className="size-8 shrink-0 text-brand-500" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Passeadores perto de você</span>
        <span className="block truncate text-sm text-muted">
          Sem tempo hoje? Um vizinho passeia com o seu pet.
        </span>
      </span>
    </Link>
  )
}
