import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Medication, medicationInputSchema } from '@tinpet/shared'
import { Pill, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'

const doseTime = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** "2026-11-14T08:00" no fuso de quem está usando (formato do input datetime-local). */
function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const intervals = [
  { hours: 6, label: 'A cada 6 h' },
  { hours: 8, label: 'A cada 8 h' },
  { hours: 12, label: 'A cada 12 h' },
  { hours: 24, label: '1 vez por dia' },
  { hours: 48, label: 'A cada 2 dias' },
  { hours: 168, label: '1 vez por semana' },
]

export const medicationsKey = (petId: string) => ['medications', petId] as const

const emptyForm = () => ({
  name: '',
  dosage: '',
  everyHours: 12,
  firstDoseAt: localDateTime(new Date()),
  endsOn: '',
})

/** Remédios em uso, com a próxima dose calculada e lembrete diário nas notificações. */
export function MedicationsCard({ petId, petName }: { petId: string; petName: string }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const medications = useQuery({
    queryKey: medicationsKey(petId),
    queryFn: () => api<Medication[]>(`/pets/${petId}/medications`),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: medicationsKey(petId) })

  const save = useMutation({
    mutationFn: () => {
      const parsed = medicationInputSchema.safeParse({
        ...form,
        firstDoseAt: new Date(form.firstDoseAt).toISOString(),
        endsOn: form.endsOn || null,
        notes: '',
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<Medication>(`/pets/${petId}/medications`, { method: 'POST', body: parsed.data })
    },
    onSuccess: () => {
      toast.success('Remédio adicionado. Avisamos você no dia de cada dose 💊')
      setForm(emptyForm())
      setAdding(false)
      refresh()
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : errorMessage(cause)),
  })
  const finish = useMutation({
    mutationFn: (id: string) => api(`/medications/${id}/finish`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Tratamento encerrado')
      refresh()
    },
    onError: (cause) => toast.error(errorMessage(cause)),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/medications/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (cause) => toast.error(errorMessage(cause)),
  })

  return (
    <section
      aria-labelledby="remedios"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="remedios" className="flex items-center gap-2 text-lg font-semibold">
            <Pill className="size-5 text-brand-500" aria-hidden /> Remédios
          </h2>
          <p className="text-sm text-muted">Calculamos as próximas doses e lembramos você.</p>
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
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              setError(null)
              save.mutate()
            }}
            className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface-2 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Remédio">
                {(props) => (
                  <input
                    placeholder="Ex.: Amoxicilina"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
              <Field label="Dose (opcional)">
                {(props) => (
                  <input
                    placeholder="Ex.: 1 comprimido, 250 mg"
                    value={form.dosage}
                    onChange={(event) => setForm({ ...form, dosage: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
            </div>
            <Field label="Frequência">
              {(props) => (
                <select
                  value={form.everyHours}
                  onChange={(event) => setForm({ ...form, everyHours: Number(event.target.value) })}
                  {...props}
                >
                  {intervals.map((interval) => (
                    <option key={interval.hours} value={interval.hours}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primeira dose">
                {(props) => (
                  <input
                    type="datetime-local"
                    value={form.firstDoseAt}
                    onChange={(event) => setForm({ ...form, firstDoseAt: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
              <Field label="Último dia (vazio = uso contínuo)">
                {(props) => (
                  <input
                    type="date"
                    value={form.endsOn}
                    min={form.firstDoseAt.slice(0, 10)}
                    onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
            </div>
            {error && (
              <p role="alert" className="text-sm font-semibold text-brand-700">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={save.isPending}>
                Salvar
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {medications.isPending && <LoadingState />}
      {medications.isSuccess && medications.data.length === 0 && !adding && (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          {petName} está tomando algum remédio? Cadastre e receba o lembrete no dia de cada dose.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {medications.data?.map((medication) => (
          <li
            key={medication.id}
            className={`flex items-center gap-3 py-3 ${medication.active ? '' : 'opacity-60'}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {medication.name}
                {medication.dosage && (
                  <span className="font-normal text-muted"> · {medication.dosage}</span>
                )}
              </p>
              <p className="text-sm text-muted">
                {medication.active && medication.nextDoseAt
                  ? `Próxima dose: ${doseTime.format(new Date(medication.nextDoseAt))}`
                  : 'Tratamento encerrado'}
              </p>
            </div>
            {medication.active && (
              <Button
                variant="ghost"
                className="min-h-9 shrink-0 px-3 py-1.5 text-sm"
                disabled={finish.isPending}
                onClick={() => {
                  if (window.confirm(`Encerrar o tratamento com ${medication.name} hoje?`))
                    finish.mutate(medication.id)
                }}
              >
                Encerrar
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Apagar ${medication.name} do histórico?`))
                  remove.mutate(medication.id)
              }}
              aria-label={`Apagar ${medication.name}`}
              className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-brand-700"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
