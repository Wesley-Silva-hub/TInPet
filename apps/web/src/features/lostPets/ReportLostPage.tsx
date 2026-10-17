import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type LostPetAlertSummary, lostPetAlertInputSchema, type Pet } from '@tinpet/shared'
import { LocateFixed, Siren } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { currentPosition } from '../../lib/geolocation'
import { lostPetsKey } from './queries'

/** "2026-10-17T14:30" no fuso de quem está usando (formato do input datetime-local). */
function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const inputClass =
  'rounded-2xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none'

export function ReportLostPage() {
  const { id } = useParams() as { id: string }
  const pet = useQuery({ queryKey: ['pet', id], queryFn: () => api<Pet>(`/pets/${id}`) })
  if (pet.isPending) return <LoadingState />
  if (pet.isError) return <ErrorState error={pet.error} onRetry={() => pet.refetch()} />
  return <ReportLostForm pet={pet.data} />
}

function ReportLostForm({ pet }: { pet: Pet }) {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [neighborhood, setNeighborhood] = useState('')
  const [lastSeen, setLastSeen] = useState(() => localDateTime(new Date()))
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState('')
  const [useGps, setUseGps] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: async () => {
      const position = useGps ? await currentPosition().catch(() => null) : null
      if (useGps && !position && !me.hasLocation) {
        throw new Error('Não conseguimos sua localização. Ative o GPS para avisar os vizinhos.')
      }
      const rewardCents = reward ? Math.round(Number(reward.replace(',', '.')) * 100) : null
      const parsed = lostPetAlertInputSchema.safeParse({
        petId: pet.id,
        description,
        rewardCents: rewardCents && Number.isFinite(rewardCents) ? rewardCents : null,
        neighborhood,
        lastSeenAt: new Date(lastSeen).toISOString(),
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<LostPetAlertSummary & { notified: number }>('/lost-pets', {
        method: 'POST',
        body: parsed.data,
      })
    },
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: lostPetsKey })
      queryClient.invalidateQueries({ queryKey: ['pet', pet.id] })
      toast.success(
        alert.notified > 0
          ? `Alerta no ar! ${alert.notified} ${alert.notified === 1 ? 'vizinho foi avisado' : 'vizinhos foram avisados'} agora.`
          : 'Alerta no ar! Compartilhe para mais gente ajudar.',
        { duration: 8000 },
      )
      navigate(`/perdidos/${alert.id}`, { replace: true })
    },
    onError: (cause) => setError(errorMessage(cause)),
  })

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader title={`${pet.name} sumiu?`} />
      <p className="-mt-3 text-muted">
        Calma: vamos avisar agora os tutores num raio de 10 km. Quem vir {pet.name} toca em "Vi este
        pet!" e você recebe na hora.
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
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Bairro onde foi visto por último</span>
          <input
            value={neighborhood}
            maxLength={80}
            onChange={(event) => setNeighborhood(event.target.value)}
            placeholder="Ex.: Jóquei"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Quando?</span>
          <input
            type="datetime-local"
            value={lastSeen}
            max={localDateTime(new Date())}
            onChange={(event) => setLastSeen(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Como reconhecer</span>
          <textarea
            rows={4}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Cor da coleira, marcas, se é medroso, se atende pelo nome…"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Recompensa (opcional)</span>
          <input
            inputMode="decimal"
            value={reward}
            onChange={(event) => setReward(event.target.value.replace(/[^\d,]/g, ''))}
            placeholder="R$ 0,00"
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
              <LocateFixed className="size-4" aria-hidden /> Estou perto de onde ele sumiu
            </span>
            Usamos o GPS agora; sem ele, sua localização cadastrada. Os vizinhos veem só o bairro e
            a distância aproximada, nunca o endereço.
          </span>
        </label>
        {error && (
          <p role="alert" className="font-semibold text-brand-700">
            {error}
          </p>
        )}
        <Button type="submit" loading={submit.isPending} className="py-4 text-lg">
          <Siren className="size-5" aria-hidden /> Avisar os vizinhos agora
        </Button>
      </form>
    </div>
  )
}
