import { useMutation, useQueryClient } from '@tanstack/react-query'
import { speciesLabels, type Walk, walkDurations, walkRequestInputSchema } from '@tinpet/shared'
import { ArrowLeft, CalendarClock, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMyPets } from '../profile/queries'
import { useWalker, walksKey } from './queries'
import { daysText, priceText } from './WalkersPage'

/** "2026-11-21T16:00" no fuso de quem está usando (formato do input datetime-local). */
function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function tomorrowAt(hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, 0, 0, 0)
  return date
}

export function WalkerPage() {
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const walker = useWalker(id)
  const pets = useMyPets()
  const [petId, setPetId] = useState('')
  const [startsAt, setStartsAt] = useState(() => localDateTime(tomorrowAt(8)))
  const [duration, setDuration] = useState<(typeof walkDurations)[number]>(30)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => {
      const parsed = walkRequestInputSchema.safeParse({
        walkerId: id,
        petId: petId || pets.data?.find((pet) => walker.data?.species.includes(pet.species))?.id,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes: duration,
        note,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<Walk>('/walks', { method: 'POST', body: parsed.data })
    },
    onSuccess: () => {
      toast.success('Pedido enviado! Você recebe um aviso quando o passeador responder.')
      queryClient.invalidateQueries({ queryKey: walksKey })
      navigate('/passeios')
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : errorMessage(cause)),
  })

  if (walker.isPending) return <LoadingState />
  if (walker.isError) return <ErrorState error={walker.error} onRetry={() => walker.refetch()} />
  const item = walker.data
  const myPets = (pets.data ?? []).filter((pet) => item.species.includes(pet.species))

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Link
        to="/passeadores"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Passeadores
      </Link>
      <header className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-4">
          <Avatar src={item.avatarUrl} name={item.name} className="size-20" />
          <div>
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            <p className="font-semibold text-brand-600">
              {priceText(item.priceCents)}{' '}
              <span className="font-normal text-muted">por passeio de {item.walkMinutes} min</span>
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          <li className="flex items-center gap-2">
            <MapPin className="size-4" aria-hidden />{' '}
            {item.neighborhoods || item.city || 'Perto de você'}
            {item.distanceKm !== null && ` · ${item.distanceKm} km`}
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4" aria-hidden /> {daysText(item.weekdays)}
          </li>
          <li>Atende: {item.species.map((value) => speciesLabels[value]).join(', ')}</li>
        </ul>
        {item.bio && <p className="whitespace-pre-line">{item.bio}</p>}
      </header>

      <section aria-labelledby="pedir" className="flex flex-col gap-3">
        <h2 id="pedir" className="text-xl font-semibold">
          Pedir um passeio
        </h2>
        {pets.isSuccess && myPets.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
            Este passeador atende {item.species.map((value) => speciesLabels[value]).join(', ')}, e
            você não tem pet dessa espécie cadastrado.
          </p>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              setError(null)
              submit.mutate()
            }}
            className="flex flex-col gap-3"
          >
            {myPets.length > 1 && (
              <Field label="Pet">
                {(props) => (
                  <select
                    value={petId}
                    onChange={(event) => setPetId(event.target.value)}
                    {...props}
                  >
                    {myPets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quando">
                {(props) => (
                  <input
                    type="datetime-local"
                    value={startsAt}
                    min={localDateTime(new Date())}
                    onChange={(event) => setStartsAt(event.target.value)}
                    {...props}
                  />
                )}
              </Field>
              <Field label="Duração">
                {(props) => (
                  <select
                    value={duration}
                    onChange={(event) =>
                      setDuration(Number(event.target.value) as (typeof walkDurations)[number])
                    }
                    {...props}
                  >
                    {walkDurations.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutos
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Recado (opcional)">
              {(props) => (
                <textarea
                  rows={3}
                  maxLength={300}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Onde buscar, se puxa a guia, se tem medo de moto…"
                  {...props}
                />
              )}
            </Field>
            {error && (
              <p role="alert" className="font-semibold text-brand-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={submit.isPending}>
              Enviar pedido
            </Button>
          </form>
        )}
      </section>
    </div>
  )
}
