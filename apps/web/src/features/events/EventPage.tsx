import { eventKindLabels, speciesLabels } from '@tinpet/shared'
import { ArrowLeft, CalendarX, Check, Clock, MapPin, Share2, Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { kindEmoji } from './EventsPage'
import { eventWhen, shareEvent, useEvent, useEventAction } from './queries'

export function EventPage() {
  const { id } = useParams() as { id: string }
  const event = useEvent(id)
  const action = useEventAction(id)

  if (event.isPending) return <LoadingState />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />
  const item = event.data
  const finished = new Date(item.endsAt ?? item.startsAt).getTime() + 3 * 3_600_000 < Date.now()
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [item.place, item.neighborhood].filter(Boolean).join(', '),
  )}`

  const share = async () => {
    try {
      if ((await shareEvent(item)) === 'copied') toast.success('Link copiado!')
    } catch {
      // Compartilhamento cancelado pelo usuário
    }
  }

  const cancel = () => {
    if (window.confirm('Cancelar o evento? Quem confirmou presença será avisado.')) {
      action.mutate('cancel')
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link
        to="/eventos"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Eventos
      </Link>

      <header className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <p className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
          {kindEmoji[item.kind]} {eventKindLabels[item.kind]}
        </p>
        <h1 className="text-3xl leading-tight font-semibold">{item.title}</h1>
        {item.cancelled && (
          <p
            role="status"
            className="rounded-2xl bg-brand-100 px-4 py-2 font-semibold text-brand-700"
          >
            Este evento foi cancelado.
          </p>
        )}
        <ul className="flex flex-col gap-2 text-muted">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden /> {eventWhen(item)}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {item.place}
              {item.neighborhood && `, ${item.neighborhood}`}
            </a>
            {item.distanceKm !== null && !item.isMine && <span>· {item.distanceKm} km</span>}
          </li>
          {item.species.length > 0 && (
            <li>Para: {item.species.map((value) => speciesLabels[value]).join(', ')}</li>
          )}
        </ul>
        {item.description && <p className="whitespace-pre-line">{item.description}</p>}
        <Link
          to={item.isMine ? '/perfil' : `/usuarios/${item.organizer.id}`}
          className="flex items-center gap-2 self-start rounded-full py-1 pr-3 hover:bg-surface-2"
        >
          <Avatar src={item.organizer.avatarUrl} name={item.organizer.name} className="size-8" />
          <span className="text-sm">
            Organizado por <span className="font-semibold">{item.organizer.name}</span>
          </span>
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {!item.cancelled &&
          !finished &&
          !item.isMine &&
          (item.going ? (
            <Button
              variant="secondary"
              loading={action.isPending}
              onClick={() => action.mutate('unattend')}
            >
              <Check className="size-4" aria-hidden /> Vou! (desfazer)
            </Button>
          ) : (
            <Button loading={action.isPending} onClick={() => action.mutate('attend')}>
              <Users className="size-4" aria-hidden /> Vou!
            </Button>
          ))}
        <Button variant="secondary" onClick={share}>
          <Share2 className="size-4" aria-hidden /> Convidar
        </Button>
        {item.isMine && !item.cancelled && !finished && (
          <Button variant="ghost" loading={action.isPending} onClick={cancel}>
            <CalendarX className="size-4" aria-hidden /> Cancelar evento
          </Button>
        )}
      </div>

      <section aria-labelledby="quem-vai" className="flex flex-col gap-3">
        <h2 id="quem-vai" className="text-xl font-semibold">
          {item.attendeeCount === 0
            ? 'Ninguém confirmou ainda'
            : `${item.attendeeCount} ${item.attendeeCount === 1 ? 'pessoa vai' : 'pessoas vão'}`}
        </h2>
        {item.attendees.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {item.attendees.map((person) => (
              <li key={person.id} className="flex items-center gap-2 rounded-full bg-surface pr-3">
                <Avatar src={person.avatarUrl} name={person.name} className="size-9" />
                <span className="text-sm font-semibold">{person.name.split(' ')[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
