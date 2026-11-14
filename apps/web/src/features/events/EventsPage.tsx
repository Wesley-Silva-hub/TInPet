import { eventKindLabels, type PetEvent } from '@tinpet/shared'
import { CalendarHeart, CalendarPlus, MapPin, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { eventWhen, useEvents } from './queries'

export const kindEmoji: Record<PetEvent['kind'], string> = {
  MEETUP: '🐶',
  ADOPTION_FAIR: '🏠',
  WALK: '🦮',
  VACCINATION: '💉',
  OTHER: '📅',
}

function DateBadge({ iso }: { iso: string }) {
  const date = new Date(iso)
  return (
    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-surface-2 dark:text-brand-400">
      <span className="text-center leading-none">
        <span className="block font-display text-2xl font-semibold">{date.getDate()}</span>
        <span className="text-xs font-bold uppercase">
          {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
        </span>
      </span>
    </span>
  )
}

function EventCard({ event, index }: { event: PetEvent; index: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
    >
      <Link
        to={`/eventos/${event.id}`}
        className="flex gap-4 rounded-card border border-line bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <DateBadge iso={event.startsAt} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
            {kindEmoji[event.kind]} {eventKindLabels[event.kind]}
            {event.isMine && ' · seu evento'}
            {event.going && !event.isMine && ' · você vai'}
          </p>
          <p className="font-display text-xl leading-tight font-semibold">{event.title}</p>
          <p className="text-sm text-muted">{eventWhen(event)}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {event.place}
              {event.distanceKm !== null && !event.isMine && ` · ${event.distanceKm} km`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {event.attendeeCount}{' '}
              {event.attendeeCount === 1 ? 'vai' : 'vão'}
            </span>
          </p>
        </div>
      </Link>
    </motion.li>
  )
}

export function EventsPage() {
  const events = useEvents()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader
        title="Eventos"
        action={
          <Link
            to="/eventos/novo"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-4 font-semibold text-white hover:bg-brand-600"
          >
            <CalendarPlus className="size-4" aria-hidden /> Criar
          </Link>
        }
      />
      <p className="-mt-3 text-muted">
        Encontros, passeios em grupo, feiras de adoção e vacinação perto de você.
      </p>
      {events.isPending ? (
        <LoadingState />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : events.data.length === 0 ? (
        <EmptyState icon={<CalendarHeart className="size-8" />} title="Nenhum evento por perto">
          Que tal marcar o primeiro? Um passeio no parque já reúne a turma, e os tutores da região
          são avisados na hora.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.data.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </ul>
      )}
    </div>
  )
}
