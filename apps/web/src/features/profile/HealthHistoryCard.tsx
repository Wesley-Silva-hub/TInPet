import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type HealthRecord,
  type HealthRecordKind,
  healthRecordInputSchema,
  healthRecordKindLabels,
  healthRecordKinds,
} from '@tinpet/shared'
import { ClipboardList, Plus, Scale, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** Data de hoje no fuso de quem está usando. */
const localToday = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

const kindEmoji: Record<HealthRecordKind, string> = {
  CONSULTATION: '🩺',
  EXAM: '🧪',
  SURGERY: '🏥',
  WEIGHT: '⚖️',
  OTHER: '📝',
}

export const healthRecordsKey = (petId: string) => ['health-records', petId] as const

const emptyForm = () => ({
  kind: 'CONSULTATION' as HealthRecordKind,
  date: localToday(),
  title: '',
  clinic: '',
  notes: '',
  weight: '',
})

/** Variação entre a pesagem mais recente e a anterior. */
function WeightTrend({ records }: { records: HealthRecord[] }) {
  const weights = records.filter((record) => record.weightKg !== null)
  const [latest, previous] = weights
  if (!latest?.weightKg) return null
  const diff = previous?.weightKg ? latest.weightKg - previous.weightKg : null
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
      <Scale className="size-4 text-brand-500" aria-hidden />
      <span>
        Peso atual: <strong>{kg.format(latest.weightKg)} kg</strong>
        {diff !== null && diff !== 0 && (
          <span className="text-muted">
            {' '}
            ({diff > 0 ? '+' : '−'}
            {kg.format(Math.abs(diff))} kg desde a pesagem anterior)
          </span>
        )}
      </span>
    </p>
  )
}

/** Histórico de consultas, exames, cirurgias e pesagens (privado do tutor). */
export function HealthHistoryCard({ petId }: { petId: string }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const records = useQuery({
    queryKey: healthRecordsKey(petId),
    queryFn: () => api<HealthRecord[]>(`/pets/${petId}/health-records`),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: healthRecordsKey(petId) })
  const isWeight = form.kind === 'WEIGHT'

  const save = useMutation({
    mutationFn: () => {
      const weightKg = form.weight ? Number(form.weight.replace(',', '.')) : null
      const parsed = healthRecordInputSchema.safeParse({
        kind: form.kind,
        date: form.date,
        title: form.title,
        clinic: form.clinic,
        notes: form.notes,
        weightKg: weightKg !== null && Number.isFinite(weightKg) ? weightKg : null,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os dados')
      return api<HealthRecord>(`/pets/${petId}/health-records`, {
        method: 'POST',
        body: parsed.data,
      })
    },
    onSuccess: () => {
      toast.success('Registro salvo no histórico')
      setForm(emptyForm())
      setAdding(false)
      refresh()
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : errorMessage(cause)),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/health-records/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (cause) => toast.error(errorMessage(cause)),
  })

  return (
    <section
      aria-labelledby="historico-saude"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="historico-saude" className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="size-5 text-brand-500" aria-hidden /> Histórico de saúde
          </h2>
          <p className="text-sm text-muted">Consultas, exames, cirurgias e peso. Só você vê.</p>
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
              <Field label="Tipo">
                {(props) => (
                  <select
                    value={form.kind}
                    onChange={(event) =>
                      setForm({ ...form, kind: event.target.value as HealthRecordKind })
                    }
                    {...props}
                  >
                    {healthRecordKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kindEmoji[kind]} {healthRecordKindLabels[kind]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Data">
                {(props) => (
                  <input
                    type="date"
                    max={localToday()}
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
            </div>
            {isWeight ? (
              <Field label="Peso (kg)">
                {(props) => (
                  <input
                    inputMode="decimal"
                    placeholder="Ex.: 12,4"
                    value={form.weight}
                    onChange={(event) =>
                      setForm({ ...form, weight: event.target.value.replace(/[^\d,.]/g, '') })
                    }
                    {...props}
                  />
                )}
              </Field>
            ) : (
              <Field label="O que foi">
                {(props) => (
                  <input
                    placeholder="Ex.: Check-up anual, hemograma, castração"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
            )}
            {!isWeight && (
              <Field label="Clínica ou veterinário (opcional)">
                {(props) => (
                  <input
                    value={form.clinic}
                    onChange={(event) => setForm({ ...form, clinic: event.target.value })}
                    {...props}
                  />
                )}
              </Field>
            )}
            <Field label="Observações (opcional)">
              {(props) => (
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  {...props}
                />
              )}
            </Field>
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

      {records.isPending && <LoadingState />}
      {records.data && <WeightTrend records={records.data} />}
      {records.isSuccess && records.data.length === 0 && !adding && (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          Guarde aqui consultas, exames e pesagens: fica tudo à mão na próxima ida ao veterinário.
        </p>
      )}
      <ol className="flex flex-col divide-y divide-line">
        {records.data?.map((record) => (
          <li key={record.id} className="flex items-start gap-3 py-3">
            <span className="text-xl" aria-hidden>
              {kindEmoji[record.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {record.kind === 'WEIGHT' && record.weightKg !== null
                  ? `${kg.format(record.weightKg)} kg`
                  : record.title}
              </p>
              <p className="text-sm text-muted">
                {healthRecordKindLabels[record.kind]} ·{' '}
                {dateFormat.format(new Date(`${record.date}T00:00:00Z`))}
                {record.clinic && ` · ${record.clinic}`}
              </p>
              {record.notes && <p className="mt-1 text-sm whitespace-pre-line">{record.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apagar este registro?')) remove.mutate(record.id)
              }}
              aria-label="Apagar registro"
              className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-brand-700"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
