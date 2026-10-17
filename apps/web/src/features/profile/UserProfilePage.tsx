import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type Pet,
  type PublicUser,
  purposeLabels,
  reportReasonLabels,
  reportReasons,
  speciesLabels,
} from '@tinpet/shared'
import { Ban, Flag } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { PostGrid } from '../social/PostGrid'

export function UserProfilePage() {
  const { id } = useParams() as { id: string }
  const profile = useQuery({
    queryKey: ['user', id],
    queryFn: () => api<{ user: PublicUser; pets: Pet[] }>(`/users/${id}`),
  })
  if (profile.isPending) return <LoadingState />
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
  const { user, pets } = profile.data
  const details = [
    `${user.age} anos`,
    [user.city, user.state].filter(Boolean).join(' – '),
    user.maritalStatus,
    user.profession,
  ].filter(Boolean)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <Avatar src={user.avatarUrl} name={user.name} className="size-28" />
        <h1 className="text-3xl font-semibold">{user.name}</h1>
        <p className="text-muted">{details.join(' · ')}</p>
        {user.bio && <p className="max-w-md">{user.bio}</p>}
      </section>

      <section aria-labelledby="pets-do-tutor" className="flex flex-col gap-3">
        <h2 id="pets-do-tutor" className="text-lg font-semibold">
          Pets
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <li key={pet.id}>
              <Link
                to={`/pets/${pet.id}`}
                className="group block h-full overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {pet.photos[0] && (
                  <div className="overflow-hidden">
                    <img
                      src={pet.photos[0].url}
                      alt={`Foto de ${pet.name}`}
                      className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-xl font-semibold">{pet.name}</h3>
                  <p className="text-sm text-muted">
                    {speciesLabels[pet.species]}
                    {pet.breed && ` · ${pet.breed}`} · {purposeLabels[pet.purpose]}
                  </p>
                  {pet.bio && <p className="mt-2 line-clamp-2">{pet.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fotos-do-tutor" className="flex flex-col gap-3">
        <h2 id="fotos-do-tutor" className="text-lg font-semibold">
          Publicações
        </h2>
        <PostGrid authorId={user.id} emptyText="Ainda sem publicações." />
      </section>

      <SafetyActions user={user} />
    </div>
  )
}

function SafetyActions({ user }: { user: PublicUser }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState<(typeof reportReasons)[number]>('SPAM')
  const [details, setDetails] = useState('')

  const block = useMutation({
    mutationFn: () => api(`/users/${user.id}/block`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(`${user.name} foi bloqueado(a)`)
      queryClient.invalidateQueries()
      navigate('/matches', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const report = useMutation({
    mutationFn: () =>
      api(`/users/${user.id}/report`, { method: 'POST', body: { reason, details } }),
    onSuccess: () => {
      toast.success('Denúncia enviada. Obrigado por ajudar a manter o TinPet seguro.')
      setReporting(false)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          loading={block.isPending}
          onClick={() => {
            if (
              window.confirm(`Bloquear ${user.name}? Vocês deixam de se ver e o match é desfeito.`)
            )
              block.mutate()
          }}
        >
          <Ban className="size-4" aria-hidden /> Bloquear
        </Button>
        <Button
          variant="ghost"
          onClick={() => setReporting((value) => !value)}
          aria-expanded={reporting}
        >
          <Flag className="size-4" aria-hidden /> Denunciar
        </Button>
      </div>
      {reporting && (
        <form
          className="flex flex-col gap-3 rounded-card bg-surface-2 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            report.mutate()
          }}
        >
          <Field label="Motivo">
            {(props) => (
              <select
                {...props}
                value={reason}
                onChange={(event) => setReason(event.target.value as typeof reason)}
              >
                {reportReasons.map((item) => (
                  <option key={item} value={item}>
                    {reportReasonLabels[item]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Detalhes (opcional)">
            {(props) => (
              <textarea
                rows={3}
                maxLength={1000}
                {...props}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={report.isPending}>
            Enviar denúncia
          </Button>
        </form>
      )}
    </section>
  )
}
