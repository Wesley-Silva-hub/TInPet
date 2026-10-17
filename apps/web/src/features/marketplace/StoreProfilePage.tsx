import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { companyKindLabels, companyKinds, type Me, storeProfileInputSchema } from '@tinpet/shared'
import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { api, errorMessage } from '../../lib/api'
import { useAuth, useMe } from '../../lib/auth'
import { currentPosition } from '../../lib/geolocation'

const nullIfBlank = (value: string) => value.trim() || null

export function StoreProfilePage() {
  const me = useMe()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [locating, setLocating] = useState(false)
  const company = me.company
  const form = useForm({
    resolver: zodResolver(storeProfileInputSchema),
    defaultValues: {
      tradeName: company?.tradeName ?? me.name,
      kind: company?.kind ?? 'PETSHOP',
      description: company?.description ?? '',
      neighborhood: company?.neighborhood ?? '',
      address: company?.address ?? '',
      phone: company?.phone ?? null,
      website: company?.website ?? null,
      delivers: company?.delivers ?? false,
    },
  })
  const { errors, isSubmitting } = form.formState

  const save = form.handleSubmit(async (values) => {
    try {
      setUser(await api<Me>('/me/store', { method: 'PUT', body: values }))
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Perfil da loja atualizado')
      navigate('/empresa')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const locate = async () => {
    setLocating(true)
    try {
      const position = await currentPosition()
      setUser(await api<Me>('/me/location', { method: 'PUT', body: position }))
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Localização salva. Tutores próximos já podem encontrar sua loja!')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="Perfil da loja" />

      <section
        className={`flex items-center gap-4 rounded-card border p-4 ${me.hasLocation ? 'border-line bg-surface' : 'border-sun-400/60 bg-sun-400/15'}`}
      >
        <MapPin className="size-8 shrink-0 text-brand-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {me.hasLocation ? 'Localização definida' : 'Defina a localização da loja'}
          </p>
          <p className="text-sm text-muted">
            É ela que coloca você no "perto de você" e no alcance dos anúncios. Guardamos só a
            posição aproximada.
          </p>
        </div>
        <Button variant="secondary" loading={locating} onClick={locate}>
          <LocateFixed className="size-4" aria-hidden /> {me.hasLocation ? 'Atualizar' : 'Usar GPS'}
        </Button>
      </section>

      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Nome da loja" error={errors.tradeName?.message}>
          {(props) => <input {...props} {...form.register('tradeName')} />}
        </Field>
        <Field label="Tipo" error={errors.kind?.message}>
          {(props) => (
            <select {...props} {...form.register('kind')}>
              {companyKinds.map((value) => (
                <option key={value} value={value}>
                  {companyKindLabels[value]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Sobre a loja"
          hint="O que você oferece de especial? Aparece na página da loja."
          error={errors.description?.message}
        >
          {(props) => (
            <textarea rows={3} maxLength={500} {...props} {...form.register('description')} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bairro" error={errors.neighborhood?.message}>
            {(props) => <input {...props} {...form.register('neighborhood')} />}
          </Field>
          <Field label="WhatsApp" error={errors.phone?.message}>
            {(props) => (
              <input
                type="tel"
                placeholder="(11) 90000-0000"
                {...props}
                {...form.register('phone', { setValueAs: nullIfBlank })}
              />
            )}
          </Field>
        </div>
        <Field
          label="Endereço (opcional)"
          hint="Usado no botão 'Como chegar'"
          error={errors.address?.message}
        >
          {(props) => <input {...props} {...form.register('address')} />}
        </Field>
        <Field label="Site (opcional)" error={errors.website?.message}>
          {(props) => (
            <input
              type="url"
              placeholder="https://"
              {...props}
              {...form.register('website', { setValueAs: nullIfBlank })}
            />
          )}
        </Field>
        <label className="flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-brand-500"
            {...form.register('delivers')}
          />
          Faço entregas
        </label>
        <Button type="submit" loading={isSubmitting}>
          Salvar perfil
        </Button>
      </form>
    </div>
  )
}
