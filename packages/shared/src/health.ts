import { z } from 'zod'
import { isoDateSchema } from './common'

/** Situação pública da carteira: o detalhe de cada vacina é privado do tutor. */
export const vaccineStatuses = ['UP_TO_DATE', 'DUE_SOON', 'OVERDUE', 'NONE'] as const
export const vaccineStatusSchema = z.enum(vaccineStatuses)
export type VaccineStatus = z.infer<typeof vaccineStatusSchema>

/** Reforço que vence nos próximos dias entra como lembrete. */
export const VACCINE_REMINDER_DAYS = 30

export const vaccineInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe a vacina').max(80),
    appliedAt: isoDateSchema,
    nextDueAt: isoDateSchema.nullable(),
    clinic: z.string().trim().max(120),
    notes: z.string().trim().max(500),
  })
  .refine((data) => !data.nextDueAt || data.nextDueAt > data.appliedAt, {
    message: 'O reforço precisa ser depois da aplicação',
    path: ['nextDueAt'],
  })
  .refine((data) => data.appliedAt <= new Date().toISOString().slice(0, 10), {
    message: 'A data de aplicação não pode estar no futuro',
    path: ['appliedAt'],
  })
export type VaccineInput = z.input<typeof vaccineInputSchema>

export const vaccineSchema = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  name: z.string(),
  appliedAt: z.string(),
  nextDueAt: z.string().nullable(),
  clinic: z.string(),
  notes: z.string(),
})
export type Vaccine = z.infer<typeof vaccineSchema>

export const vaccineReminderSchema = z.object({
  vaccineId: z.uuid(),
  petId: z.uuid(),
  petName: z.string(),
  vaccineName: z.string(),
  nextDueAt: z.string(),
  /** Negativo = atrasada há N dias. */
  daysLeft: z.number().int(),
})
export type VaccineReminder = z.infer<typeof vaccineReminderSchema>

/** Calcula a situação a partir das datas de reforço das vacinas do pet. */
export function vaccineStatusOf(
  nextDueDates: (Date | string | null)[],
  today = new Date(),
): VaccineStatus {
  if (nextDueDates.length === 0) return 'NONE'
  const day = 24 * 60 * 60 * 1000
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  let status: VaccineStatus = 'UP_TO_DATE'
  for (const due of nextDueDates) {
    if (!due) continue
    const time = new Date(due).getTime()
    if (time < start) return 'OVERDUE'
    if (time - start <= VACCINE_REMINDER_DAYS * day) status = 'DUE_SOON'
  }
  return status
}

export const vaccineStatusLabels: Record<VaccineStatus, string> = {
  UP_TO_DATE: 'Vacinas em dia',
  DUE_SOON: 'Reforço próximo',
  OVERDUE: 'Vacina atrasada',
  NONE: 'Sem vacinas registradas',
}

/** Sugestões para o campo de nome (o tutor pode digitar outra). */
export const commonVaccines = [
  'V8 / V10 (polivalente canina)',
  'Antirrábica',
  'Gripe canina',
  'Giardíase',
  'Leishmaniose',
  'V4 / V5 (polivalente felina)',
  'FeLV (leucemia felina)',
]
