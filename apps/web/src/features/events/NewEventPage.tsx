import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  species as allSpecies,
  EVENT_NOTIFY_RADIUS_KM,
  eventInputSchema,
  eventKindLabels,
  eventKinds,
  type PetEventDetail,
  type Species,
  speciesLabels,
} from '@tinpet/shared'
import { CalendarPlus, LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { currentPosition } from '../../lib/geolocation'
import { kindEmoji } from './EventsPage'
import { eventsKey } from './queries'

/** "2026-11-21T16:00" no fuso de quem está usando (formato do input datetime-local). */
function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/** Sugestão inicial: próximo sábado às 16h. */
function nextSaturday(): Date {
  const date = new Date()
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7))
  date.setHours(16, 0, 0, 0)
  return date
}

const inputClass =
  'rounded-2xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none'

export function NewEventPage() {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<(typeof eventKinds)[number]>('MEETUP')
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState(() => localDateTime(nextSaturday()))
  const [endsAt, setEndsAt] = useState('')
  const [place, setPlace] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [description, setDescription] = useState('')
  const [species, setSpecies] = useState<Species[]>([])
  const [useGps, setUseGps] = useState(!me.hasLocation)
  const [error, setError] = useState<string | null>(null)

  const toggleSpecies = (value: Species) =>
    setSpecies((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )

  const submit = useMutation({
    mutationFn: async () => {
      const position = useGps ? await currentPosition().catch(() => null) : null
      if (!position && !me.hasLocation) {
        throw new Error('Precisamos da localização para mostrar o evento a quem está perto.')
      }
      const parsed = eventInputSchema.safeParse({
        title,
        description,
        kind,
        species,
        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        place,
        neighborhood,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<PetEventDetail & { notified: number }>('/events', {
        method: 'POST',
        body: parsed.data,
      })
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventsKey })
      toast.success(
        event.notified > 0
          ? `Evento criado! ${event.notified} ${event.notified === 1 ? 'tutor da região foi avisado' : 'tutores da região foram avisados'}.`
          : 'Evento criado! Compartilhe para chamar mais gente.',
        { duration: 8000 },
      )
      navigate(`/eventos/${event.id}`, { replace: true })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : errorMessage(cause)),
  })

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader title="Criar evento" />
      <p className="-mt-3 text-muted">
        Os tutores num raio de {EVENT_NOTIFY_RADIUS_KM} km recebem o convite. Prefira lugares
        públicos, como praças, parques e lojas.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          submit.mutate()
        }}
        className="flex flex-col gap-4"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            {eventKinds.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition focus-within:ring-2 ${
                  kind === value
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                {kindEmoji[value]} {eventKindLabels[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Nome do evento</span>
          <input
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Cãominhada no Parque da Cidadania"
            className={inputClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Começa</span>
            <input
              type="datetime-local"
              value={startsAt}
              min={localDateTime(new Date())}
              onChange={(event) => setStartsAt(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Termina (opcional)</span>
            <input
              type="datetime-local"
              value={endsAt}
              min={startsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Local</span>
          <input
            value={place}
            maxLength={120}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Ex.: Parque da Cidadania, perto do lago"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Bairro (opcional)</span>
          <input
            value={neighborhood}
            maxLength={80}
            onChange={(event) => setNeighborhood(event.target.value)}
            placeholder="Ex.: Centro"
            className={inputClass}
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">
            Para quais pets? <span className="font-normal text-muted">(nenhum = todos)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {allSpecies.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-within:ring-2 ${
                  species.includes(value)
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <input
                  type="checkbox"
                  checked={species.includes(value)}
                  onChange={() => toggleSpecies(value)}
                  className="sr-only"
                />
                {speciesLabels[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Detalhes (opcional)</span>
          <textarea
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="O que levar, ponto de encontro, regras (coleira, vacinas em dia)…"
            className={inputClass}
          />
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
          <input
            type="checkbox"
            checked={useGps}
            onChange={(event) => setUseGps(event.target.checked)}
            className="mt-0.5 size-5 accent-brand-500"
          />
          <span>
            <span className="flex items-center gap-1 font-semibold">
              <LocateFixed className="size-4" aria-hidden /> Estou no local do evento agora
            </span>
            Usamos o GPS agora; sem ele, sua localização cadastrada. Os outros veem só o local que
            você escreveu e a distância aproximada.
          </span>
        </label>
        {error && (
          <p role="alert" className="font-semibold text-brand-700">
            {error}
          </p>
        )}
        <Button type="submit" loading={submit.isPending} className="py-4 text-lg">
          <CalendarPlus className="size-5" aria-hidden /> Criar e convidar a vizinhança
        </Button>
      </form>
    </div>
  )
}
