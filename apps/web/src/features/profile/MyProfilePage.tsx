import { zodResolver } from '@hookform/resolvers/zod'
import {
  brazilianStates,
  type LookupItem,
  type Me,
  speciesLabels,
  updateProfileSchema,
} from '@tinpet/shared'
import { Camera, Plus, Settings } from 'lucide-react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useAuth, useMe } from '../../lib/auth'
import { ACCEPTED_IMAGES, compressImage } from '../../lib/image'
import { LocationCard } from './LocationCard'
import { useLookups, useMyPets, useUploadAvatar } from './queries'

export function MyProfilePage() {
  const me = useMe()
  const lookups = useLookups()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Meu perfil"
        action={
          <Link
            to="/configuracoes"
            className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink"
          >
            <Settings className="size-5" aria-hidden /> Configurações
          </Link>
        }
      />
      <MyPets />
      <LocationCard />
      {lookups.isPending ? (
        <LoadingState />
      ) : lookups.isError ? (
        <ErrorState error={lookups.error} onRetry={() => lookups.refetch()} />
      ) : (
        <ProfileForm
          me={me}
          maritalStatuses={lookups.data.maritalStatuses}
          professions={lookups.data.professions}
        />
      )}
    </div>
  )
}

function MyPets() {
  const pets = useMyPets()
  return (
    <section aria-labelledby="meus-pets" className="flex flex-col gap-3">
      <h2 id="meus-pets" className="text-lg font-semibold">
        Meus pets
      </h2>
      {pets.isPending && <LoadingState />}
      {pets.isError && <ErrorState error={pets.error} onRetry={() => pets.refetch()} />}
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {pets.data?.map((pet) => (
          <li key={pet.id} className="shrink-0">
            <Link
              to={`/pets/${pet.id}/editar`}
              className="flex w-28 flex-col items-center gap-2 text-center"
            >
              <span className={`relative ${pet.isActive ? '' : 'opacity-50'}`}>
                <Avatar src={pet.photos[0]?.url} name={pet.name} className="size-24" />
              </span>
              <span className="font-semibold leading-tight">{pet.name}</span>
              <span className="text-xs text-muted">
                {speciesLabels[pet.species]}
                {!pet.isActive && ' · oculto'}
              </span>
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link
            to="/pets/novo"
            className="flex w-28 flex-col items-center gap-2 text-center font-semibold text-brand-600"
          >
            <span className="grid size-24 place-items-center rounded-full border-2 border-dashed border-brand-200">
              <Plus className="size-8" aria-hidden />
            </span>
            Novo pet
          </Link>
        </li>
      </ul>
    </section>
  )
}

const emptyToNull = (value: string) => (value === '' ? null : value)
const toNullableNumber = (value: string) => (value === '' ? null : Number(value))

function ProfileForm({
  me,
  maritalStatuses,
  professions,
}: {
  me: Me
  maritalStatuses: LookupItem[]
  professions: LookupItem[]
}) {
  const { setUser } = useAuth()
  const avatarInput = useRef<HTMLInputElement>(null)
  const avatar = useUploadAvatar()
  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: me.name,
      bio: me.bio,
      birthDate: me.birthDate,
      maritalStatusId: me.maritalStatus?.id ?? null,
      professionId: me.profession?.id ?? null,
      city: me.city,
      state: me.state as (typeof brazilianStates)[number] | null,
    },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setUser(await api<Me>('/me', { method: 'PUT', body: values }))
      toast.success('Perfil salvo')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  return (
    <section
      aria-labelledby="sobre-mim"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <h2 id="sobre-mim" className="text-lg font-semibold">
        Sobre mim
      </h2>
      <p className="-mt-2 text-sm text-muted">
        É o que outros tutores veem ao abrir seu perfil (sem e-mail nem endereço).
      </p>
      <div className="flex items-center gap-4">
        <Avatar src={me.avatarUrl} name={me.name} className="size-20" />
        <Button
          variant="secondary"
          loading={avatar.isPending}
          onClick={() => avatarInput.current?.click()}
        >
          <Camera className="size-4" aria-hidden /> Trocar foto
        </Button>
        <input
          ref={avatarInput}
          type="file"
          accept={ACCEPTED_IMAGES}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            avatar.mutate(await compressImage(file, 512), {
              onSuccess: () => toast.success('Foto atualizada'),
              onError: (error) => toast.error(errorMessage(error)),
            })
          }}
        />
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nome" error={errors.name?.message}>
          {(props) => <input autoComplete="name" {...props} {...form.register('name')} />}
        </Field>
        <Field
          label="Data de nascimento"
          hint="Os outros veem só a sua idade"
          error={errors.birthDate?.message}
        >
          {(props) => <input type="date" {...props} {...form.register('birthDate')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado civil" error={errors.maritalStatusId?.message}>
            {(props) => (
              <select
                {...props}
                {...form.register('maritalStatusId', { setValueAs: toNullableNumber })}
              >
                <option value="">Prefiro não dizer</option>
                {maritalStatuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Profissão" error={errors.professionId?.message}>
            {(props) => (
              <select
                {...props}
                {...form.register('professionId', { setValueAs: toNullableNumber })}
              >
                <option value="">Prefiro não dizer</option>
                {professions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Cidade" error={errors.city?.message}>
            {(props) => (
              <input
                autoComplete="address-level2"
                {...props}
                {...form.register('city', { setValueAs: emptyToNull })}
              />
            )}
          </Field>
          <Field label="Estado" error={errors.state?.message}>
            {(props) => (
              <select {...props} {...form.register('state', { setValueAs: emptyToNull })}>
                <option value="">—</option>
                {brazilianStates.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Bio" error={errors.bio?.message}>
          {(props) => <textarea rows={3} maxLength={500} {...props} {...form.register('bio')} />}
        </Field>
        <Button type="submit" loading={isSubmitting}>
          Salvar perfil
        </Button>
      </form>
    </section>
  )
}
