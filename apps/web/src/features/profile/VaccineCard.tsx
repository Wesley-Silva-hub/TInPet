import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commonVaccines, type Vaccine, vaccineInputSchema } from '@tinpet/shared'
import { Plus, ShieldCheck, Syringe, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'

const DAY_MS = 24 * 60 * 60 * 1000
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const today = () => new Date().toISOString().slice(0, 10)
const toNullable = (value: string) => (value === '' ? null : value)

function dueBadge(nextDueAt: string | null) {
  if (!nextDueAt) return { label: 'Dose única', className: 'bg-surface-2 text-muted' }
  const days = Math.round(
    (new Date(`${nextDueAt}T00:00:00Z`).getTime() - Date.parse(`${today()}T00:00:00Z`)) / DAY_MS,
  )
  if (days < 0)
    return {
      label: `Atrasada há ${-days} ${-days === 1 ? 'dia' : 'dias'}`,
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    }
  if (days <= 30)
    return {
      label: days === 0 ? 'Reforço hoje' : `Reforço em ${days} ${days === 1 ? 'dia' : 'dias'}`,
      className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    }
  return {
    label: `Reforço em ${dateFormat.format(new Date(`${nextDueAt}T00:00:00Z`))}`,
    className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  }
}

export const vaccinesKey = (petId: string) => ['vaccines', petId] as const

/** Carteira de vacinação do pet (privada: só o tutor vê). */
export function VaccineCard({ petId, petName }: { petId: string; petName: string }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const listId = useId()
  const vaccines = useQuery({
    queryKey: vaccinesKey(petId),
    queryFn: () => api<Vaccine[]>(`/pets/${petId}/vaccines`),
  })
  const form = useForm({
    resolver: zodResolver(vaccineInputSchema),
    defaultValues: { name: '', appliedAt: today(), nextDueAt: null, clinic: '', notes: '' },
  })
  const { errors, isSubmitting } = form.formState

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: vaccinesKey(petId) })
    queryClient.invalidateQueries({ queryKey: ['reminders'] })
    queryClient.invalidateQueries({ queryKey: ['pet', petId] })
  }

  const save = form.handleSubmit(async (values) => {
    try {
      await api<Vaccine>(`/pets/${petId}/vaccines`, { method: 'POST', body: values })
      toast.success('Vacina registrada 💉')
      form.reset({ name: '', appliedAt: today(), nextDueAt: null, clinic: '', notes: '' })
      setAdding(false)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/vaccines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Vacina removida')
      refresh()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <section
      aria-labelledby="carteira"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="carteira" className="flex items-center gap-2 text-lg font-semibold">
            <Syringe className="size-5 text-brand-500" aria-hidden /> Carteira de vacinação
          </h2>
          <p className="text-sm text-muted">
            Só você vê os detalhes. Os outros tutores veem apenas o selo “Vacinas em dia”.
          </p>
        </div>
        {!adding && (
          <Button
            variant="secondary"
            className="min-h-9 shrink-0 px-3 py-1.5 text-sm"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" aria-hidden /> Adicionar
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={save}
            noValidate
            className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface-2 p-4"
          >
            <Field label="Vacina" error={errors.name?.message}>
              {(props) => (
                <input
                  list={listId}
                  placeholder="Ex.: Antirrábica"
                  {...props}
                  {...form.register('name')}
                />
              )}
            </Field>
            <datalist id={listId}>
              {commonVaccines.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Aplicada em" error={errors.appliedAt?.message}>
                {(props) => (
                  <input type="date" max={today()} {...props} {...form.register('appliedAt')} />
                )}
              </Field>
              <Field label="Próximo reforço (opcional)" error={errors.nextDueAt?.message}>
                {(props) => (
                  <input
                    type="date"
                    {...props}
                    {...form.register('nextDueAt', { setValueAs: toNullable })}
                  />
                )}
              </Field>
            </div>
            <Field label="Clínica ou veterinário (opcional)" error={errors.clinic?.message}>
              {(props) => <input {...props} {...form.register('clinic')} />}
            </Field>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmitting}>
                Salvar
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {vaccines.isPending && <LoadingState />}
      {vaccines.isSuccess && vaccines.data.length === 0 && !adding && (
        <p className="flex items-center gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          <ShieldCheck className="size-5 shrink-0" aria-hidden />
          Registre as vacinas de {petName} para receber lembretes de reforço e mostrar o selo de
          vacinas em dia no Descobrir.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {vaccines.data?.map((vaccine) => {
          const badge = dueBadge(vaccine.nextDueAt)
          return (
            <li key={vaccine.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{vaccine.name}</p>
                <p className="text-sm text-muted">
                  Aplicada em {dateFormat.format(new Date(`${vaccine.appliedAt}T00:00:00Z`))}
                  {vaccine.clinic && ` · ${vaccine.clinic}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badge.className}`}
              >
                {badge.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remover ${vaccine.name}?`)) remove.mutate(vaccine.id)
                }}
                aria-label={`Remover ${vaccine.name}`}
                className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-brand-700"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
