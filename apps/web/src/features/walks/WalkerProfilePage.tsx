import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  species as allSpecies,
  type Species,
  speciesLabels,
  type Walker,
  walkerProfileInputSchema,
  weekdayLabels,
} from '@tinpet/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { useMyWalkerProfile, walkersKey } from './queries'

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-within:ring-2 ${
    active ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface hover:bg-surface-2'
  }`

export function WalkerProfilePage() {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const current = useMyWalkerProfile()
  const [price, setPrice] = useState('35,00')
  const [minutes, setMinutes] = useState(30)
  const [neighborhoods, setNeighborhoods] = useState('')
  const [bio, setBio] = useState('')
  const [species, setSpecies] = useState<Species[]>(['DOG'])
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const profile = current.data
    if (!profile) return
    setPrice((profile.priceCents / 100).toFixed(2).replace('.', ','))
    setMinutes(profile.walkMinutes)
    setNeighborhoods(profile.neighborhoods)
    setBio(profile.bio)
    setSpecies(profile.species)
    setWeekdays(profile.weekdays)
    setActive(profile.active)
  }, [current.data])

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  const save = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number(price.replace(/\./g, '').replace(',', '.')) * 100)
      const parsed = walkerProfileInputSchema.safeParse({
        bio,
        priceCents: Number.isFinite(cents) ? cents : -1,
        walkMinutes: minutes,
        neighborhoods,
        species,
        weekdays,
        active,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<Walker>('/walkers/me', { method: 'PUT', body: parsed.data })
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: walkersKey })
      toast.success(
        profile.active ? 'Perfil no ar! Os vizinhos já podem pedir passeios.' : 'Perfil pausado',
      )
      navigate('/passeadores')
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : errorMessage(cause)),
  })

  if (current.isPending) return <LoadingState />

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader title={current.data ? 'Meu perfil de passeador' : 'Seja passeador'} />
      {!me.hasLocation && (
        <p role="alert" className="rounded-2xl bg-sun-400/20 p-4 text-sm">
          Ative a localização em Configurações para aparecer para os tutores da sua região.
        </p>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          save.mutate()
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Preço por passeio (R$)" hint="0 = voluntário">
            {(props) => (
              <input
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ''))}
                {...props}
              />
            )}
          </Field>
          <Field label="Duração padrão (min)">
            {(props) => (
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                {...props}
              />
            )}
          </Field>
        </div>
        <Field label="Bairros que você atende">
          {(props) => (
            <input
              value={neighborhoods}
              maxLength={200}
              onChange={(event) => setNeighborhoods(event.target.value)}
              placeholder="Ex.: Jóquei, Fátima, Ininga"
              {...props}
            />
          )}
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Dias em que você passeia</legend>
          <div className="flex flex-wrap gap-2">
            {weekdayLabels.map((label, day) => (
              <label key={label} className={chip(weekdays.includes(day))}>
                <input
                  type="checkbox"
                  checked={weekdays.includes(day)}
                  onChange={() => setWeekdays(toggle(weekdays, day))}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Pets que você passeia</legend>
          <div className="flex flex-wrap gap-2">
            {allSpecies.map((value) => (
              <label key={value} className={chip(species.includes(value))}>
                <input
                  type="checkbox"
                  checked={species.includes(value)}
                  onChange={() => setSpecies(toggle(species, value))}
                  className="sr-only"
                />
                {speciesLabels[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Sobre você (opcional)">
          {(props) => (
            <textarea
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Experiência com pets, se aceita mais de um por vez, cuidados que você toma…"
              {...props}
            />
          )}
        </Field>
        <label className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="size-5 accent-brand-500"
          />
          <span>
            <span className="block font-semibold">Aceitando pedidos</span>
            Desmarque para pausar o perfil sem apagá-lo.
          </span>
        </label>
        {error && (
          <p role="alert" className="font-semibold text-brand-700">
            {error}
          </p>
        )}
        <Button type="submit" loading={save.isPending}>
          Salvar
        </Button>
      </form>
    </div>
  )
}
