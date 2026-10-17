import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  type Breed,
  type Pet,
  petInputSchema,
  petPurposes,
  petSexes,
  petSizes,
  purposeLabels,
  sexLabels,
  sizeLabels,
  species,
  speciesLabels,
} from '@tinpet/shared'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { PetPhotos } from './PetPhotos'
import { useInvalidateMyPets, useLookups } from './queries'
import { VaccineCard } from './VaccineCard'

const toNullableNumber = (value: string) => (value === '' ? null : Number(value))
const toNullableString = (value: string) => (value === '' ? null : value)

/** Cadastro (onboarding) e edição de pet. Fotos ficam disponíveis após criar. */
export function PetFormPage() {
  const { id } = useParams()
  const pet = useQuery({
    queryKey: ['pet', id],
    queryFn: () => api<Pet>(`/pets/${id}`),
    enabled: Boolean(id),
  })
  const lookups = useLookups()
  if ((id && pet.isPending) || lookups.isPending) return <LoadingState />
  if (id && pet.isError) return <ErrorState error={pet.error} onRetry={() => pet.refetch()} />
  if (lookups.isError) return <ErrorState error={lookups.error} onRetry={() => lookups.refetch()} />
  return <PetForm key={pet.data?.id ?? 'novo'} pet={pet.data} breeds={lookups.data.breeds} />
}

function PetForm({ pet, breeds: allBreeds }: { pet: Pet | undefined; breeds: Breed[] }) {
  const navigate = useNavigate()
  const invalidate = useInvalidateMyPets()
  const form = useForm({
    resolver: zodResolver(petInputSchema),
    defaultValues: {
      name: pet?.name ?? '',
      species: pet?.species ?? 'DOG',
      breedId: pet?.breedId ?? null,
      sex: pet?.sex ?? 'MALE',
      size: pet?.size ?? 'MEDIUM',
      birthDate: pet?.birthDate ?? null,
      bio: pet?.bio ?? '',
      purpose: pet?.purpose ?? 'FRIENDSHIP',
    },
  })
  const { errors, isSubmitting } = form.formState
  const selectedSpecies = form.watch('species')
  const breeds = allBreeds.filter((breed) => breed.species === selectedSpecies)

  const save = form.handleSubmit(async (values) => {
    try {
      if (pet) {
        await api<Pet>(`/pets/${pet.id}`, { method: 'PATCH', body: values })
        toast.success('Pet atualizado')
        navigate('/perfil')
      } else {
        const created = await api<Pet>('/pets', { method: 'POST', body: values })
        toast.success('Pet cadastrado! Agora capriche nas fotos 📸')
        navigate(`/pets/${created.id}/editar`, { replace: true })
      }
      invalidate()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const toggleActive = useMutation({
    mutationFn: () =>
      api<Pet>(`/pets/${pet?.id}`, { method: 'PATCH', body: { isActive: !pet?.isActive } }),
    onSuccess: (updated) => {
      toast.success(updated.isActive ? 'Pet visível no feed' : 'Pet escondido do feed')
      invalidate()
      navigate('/perfil')
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/pets/${pet?.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Pet removido')
      invalidate()
      navigate('/perfil', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const select = (
    name: 'species' | 'sex' | 'size' | 'purpose',
    options: readonly string[],
    labels: Record<string, string>,
    label: string,
  ) => (
    <Field label={label} error={errors[name]?.message}>
      {(props) => (
        <select
          {...props}
          {...form.register(name, {
            // Raça depende da espécie
            onChange: name === 'species' ? () => form.setValue('breedId', null) : undefined,
          })}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels[option]}
            </option>
          ))}
        </select>
      )}
    </Field>
  )

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={pet ? `Editar ${pet.name}` : 'Novo pet'} />
      {pet && <PetPhotos pet={pet} />}
      {pet && <VaccineCard petId={pet.id} petName={pet.name} />}
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Nome" error={errors.name?.message}>
          {(props) => <input {...props} {...form.register('name')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {select('species', species, speciesLabels, 'Espécie')}
          <Field label="Raça" error={errors.breedId?.message}>
            {(props) => (
              <select {...props} {...form.register('breedId', { setValueAs: toNullableNumber })}>
                <option value="">Não informar</option>
                {breeds.map((breed) => (
                  <option key={breed.id} value={breed.id}>
                    {breed.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {select('sex', petSexes, sexLabels, 'Sexo')}
          {select('size', petSizes, sizeLabels, 'Porte')}
        </div>
        <Field label="Nascimento (aproximado)" error={errors.birthDate?.message}>
          {(props) => (
            <input
              type="date"
              {...props}
              {...form.register('birthDate', { setValueAs: toNullableString })}
            />
          )}
        </Field>
        {select('purpose', petPurposes, purposeLabels, 'Procurando')}
        <Field
          label="Sobre o pet"
          hint="Personalidade, manias, vacinas…"
          error={errors.bio?.message}
        >
          {(props) => <textarea rows={4} maxLength={500} {...props} {...form.register('bio')} />}
        </Field>
        <Button type="submit" loading={isSubmitting}>
          {pet ? 'Salvar alterações' : 'Cadastrar pet'}
        </Button>
      </form>

      {pet && (
        <div className="flex flex-col gap-2 border-t border-line pt-6">
          {pet.photos.length > 0 && (
            <Link to="/feed" className="text-center font-semibold text-brand-600 underline">
              Pronto! Ir para o feed
            </Link>
          )}
          <Button
            variant="secondary"
            loading={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {pet.isActive ? 'Esconder do feed' : 'Mostrar no feed'}
          </Button>
          <Button
            variant="ghost"
            className="text-brand-700"
            loading={remove.isPending}
            onClick={() => {
              if (window.confirm(`Remover ${pet.name}? Fotos, likes e matches serão apagados.`))
                remove.mutate()
            }}
          >
            Remover pet
          </Button>
        </div>
      )}
    </div>
  )
}
