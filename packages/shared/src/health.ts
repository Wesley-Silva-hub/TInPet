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

/** Remédio em uso. O intervalo vai de 1 h a 7 dias (ex.: vermífugo semanal = 168 h). */
export const medicationInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o remédio').max(80),
    dosage: z.string().trim().max(80).default(''),
    everyHours: z
      .number()
      .int('Use horas inteiras')
      .min(1, 'Intervalo mínimo de 1 hora')
      .max(168, 'Intervalo máximo de 7 dias (168 h)'),
    /** Data e hora da primeira dose (ISO). */
    firstDoseAt: z.iso.datetime({ offset: true }),
    /** Último dia do tratamento; nulo = uso contínuo. */
    endsOn: isoDateSchema.nullable().default(null),
    notes: z.string().trim().max(300).default(''),
  })
  .refine((data) => !data.endsOn || data.endsOn >= data.firstDoseAt.slice(0, 10), {
    message: 'O fim precisa ser depois da primeira dose',
    path: ['endsOn'],
  })
export type MedicationInput = z.input<typeof medicationInputSchema>

export const medicationSchema = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  name: z.string(),
  dosage: z.string(),
  everyHours: z.number().int(),
  firstDoseAt: z.string(),
  endsOn: z.string().nullable(),
  notes: z.string(),
  /** Próxima dose a partir de agora; nula se o tratamento já acabou. */
  nextDoseAt: z.string().nullable(),
  active: z.boolean(),
})
export type Medication = z.infer<typeof medicationSchema>

/** Próxima dose depois de `now`, respeitando o fim do tratamento (fim do dia em `endsOn`). */
export function nextDose(
  medication: { firstDoseAt: string | Date; everyHours: number; endsOn: string | Date | null },
  now = new Date(),
): Date | null {
  const first = new Date(medication.firstDoseAt).getTime()
  const step = medication.everyHours * 60 * 60 * 1000
  const next =
    now.getTime() <= first ? first : first + Math.ceil((now.getTime() - first) / step) * step
  if (medication.endsOn) {
    const endsOn =
      typeof medication.endsOn === 'string'
        ? medication.endsOn
        : medication.endsOn.toISOString().slice(0, 10)
    // Último dia inteiro no horário de Brasília (UTC-3)
    if (next > Date.parse(`${endsOn}T23:59:59-03:00`)) return null
  }
  return new Date(next)
}

export const healthRecordKinds = ['CONSULTATION', 'EXAM', 'SURGERY', 'WEIGHT', 'OTHER'] as const
export const healthRecordKindSchema = z.enum(healthRecordKinds)
export type HealthRecordKind = z.infer<typeof healthRecordKindSchema>

export const healthRecordKindLabels: Record<HealthRecordKind, string> = {
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  SURGERY: 'Cirurgia',
  WEIGHT: 'Pesagem',
  OTHER: 'Outro',
}

export const healthRecordInputSchema = z
  .object({
    kind: healthRecordKindSchema,
    date: isoDateSchema.refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      'A data não pode estar no futuro',
    ),
    title: z.string().trim().max(120).default(''),
    notes: z.string().trim().max(1000).default(''),
    clinic: z.string().trim().max(120).default(''),
    /** Peso em kg com até 2 casas (vira gramas inteiros no banco). */
    weightKg: z
      .number()
      .positive('Peso inválido')
      .max(200, 'Peso inválido')
      .nullable()
      .default(null),
  })
  .refine((data) => data.kind !== 'WEIGHT' || data.weightKg !== null, {
    message: 'Informe o peso',
    path: ['weightKg'],
  })
  .refine((data) => data.kind === 'WEIGHT' || data.title.length >= 2, {
    message: 'Descreva o registro',
    path: ['title'],
  })
export type HealthRecordInput = z.input<typeof healthRecordInputSchema>

export const healthRecordSchema = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  kind: healthRecordKindSchema,
  date: z.string(),
  title: z.string(),
  notes: z.string(),
  clinic: z.string(),
  weightKg: z.number().nullable(),
})
export type HealthRecord = z.infer<typeof healthRecordSchema>
