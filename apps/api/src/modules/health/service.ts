import {
  type HealthRecord,
  type healthRecordInputSchema,
  type Medication,
  type medicationInputSchema,
  nextDose,
  VACCINE_REMINDER_DAYS,
  type Vaccine,
  type VaccineReminder,
  type vaccineInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { PetHealthRecord, PetMedication, PetVaccine } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { toDateOnly } from '../../shared/dto'
import { forbidden, notFound } from '../../shared/errors'

const DAY_MS = 24 * 60 * 60 * 1000
const toDate = (value: string) => new Date(`${value}T00:00:00Z`)

const toVaccine = (vaccine: PetVaccine): Vaccine => ({
  id: vaccine.id,
  petId: vaccine.petId,
  name: vaccine.name,
  appliedAt: toDateOnly(vaccine.appliedAt),
  nextDueAt: vaccine.nextDueAt ? toDateOnly(vaccine.nextDueAt) : null,
  clinic: vaccine.clinic,
  notes: vaccine.notes,
})

/** "2026-11-14" no horário de Brasília (o dia do tutor, não o do servidor). */
export const todayInBrazil = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)

const toMedication = (row: PetMedication, now: Date): Medication => {
  const next = nextDose(row, now)
  return {
    id: row.id,
    petId: row.petId,
    name: row.name,
    dosage: row.dosage,
    everyHours: row.everyHours,
    firstDoseAt: row.firstDoseAt.toISOString(),
    endsOn: row.endsOn ? toDateOnly(row.endsOn) : null,
    notes: row.notes,
    nextDoseAt: next?.toISOString() ?? null,
    active: next !== null,
  }
}

const toRecord = (row: PetHealthRecord): HealthRecord => ({
  id: row.id,
  petId: row.petId,
  kind: row.kind,
  date: toDateOnly(row.date),
  title: row.title,
  notes: row.notes,
  clinic: row.clinic,
  weightKg: row.weightGrams === null ? null : row.weightGrams / 1000,
})

/** Saúde do pet (vacinas, remédios, histórico): visível e editável só pelo tutor. */
export function createHealthService({ db }: AppDeps) {
  async function assertOwner(user: AuthUser, petId: string) {
    const pet = await db.pet.findUnique({ where: { id: petId }, select: { ownerId: true } })
    if (!pet) throw notFound('Pet')
    if (pet.ownerId !== user.id) throw forbidden('Só o tutor acessa os dados de saúde do pet')
  }

  async function ownedMedication(user: AuthUser, medicationId: string) {
    const row = await db.petMedication.findUnique({
      where: { id: medicationId },
      include: { pet: { select: { ownerId: true } } },
    })
    if (!row) throw notFound('Remédio')
    if (row.pet.ownerId !== user.id) throw forbidden()
    return row
  }

  return {
    /** Mais recentes primeiro. */
    async list(user: AuthUser, petId: string) {
      await assertOwner(user, petId)
      const rows = await db.petVaccine.findMany({
        where: { petId },
        orderBy: [{ appliedAt: 'desc' }, { createdAt: 'desc' }],
      })
      return rows.map(toVaccine)
    },

    async add(user: AuthUser, petId: string, input: z.output<typeof vaccineInputSchema>) {
      await assertOwner(user, petId)
      const vaccine = await db.petVaccine.create({
        data: {
          petId,
          name: input.name,
          appliedAt: toDate(input.appliedAt),
          nextDueAt: input.nextDueAt ? toDate(input.nextDueAt) : null,
          clinic: input.clinic,
          notes: input.notes,
        },
      })
      return toVaccine(vaccine)
    },

    async remove(user: AuthUser, vaccineId: string) {
      const vaccine = await db.petVaccine.findUnique({
        where: { id: vaccineId },
        select: { pet: { select: { ownerId: true } } },
      })
      if (!vaccine) throw notFound('Vacina')
      if (vaccine.pet.ownerId !== user.id) throw forbidden()
      await db.petVaccine.delete({ where: { id: vaccineId } })
    },

    /** Remédios do pet: os em uso primeiro, depois os encerrados (mais recentes antes). */
    async listMedications(user: AuthUser, petId: string): Promise<Medication[]> {
      await assertOwner(user, petId)
      const rows = await db.petMedication.findMany({
        where: { petId },
        orderBy: { firstDoseAt: 'desc' },
      })
      const now = new Date()
      return rows
        .map((row) => toMedication(row, now))
        .sort((a, b) => Number(b.active) - Number(a.active))
    },

    async addMedication(
      user: AuthUser,
      petId: string,
      input: z.output<typeof medicationInputSchema>,
    ) {
      await assertOwner(user, petId)
      const row = await db.petMedication.create({
        data: {
          petId,
          name: input.name,
          dosage: input.dosage,
          everyHours: input.everyHours,
          firstDoseAt: new Date(input.firstDoseAt),
          endsOn: input.endsOn ? toDate(input.endsOn) : null,
          notes: input.notes,
        },
      })
      return toMedication(row, new Date())
    },

    /** Encerra o tratamento hoje (o histórico fica). */
    async finishMedication(user: AuthUser, medicationId: string) {
      const row = await ownedMedication(user, medicationId)
      const updated = await db.petMedication.update({
        where: { id: row.id },
        data: { endsOn: toDate(todayInBrazil()) },
      })
      return toMedication(updated, new Date())
    },

    async removeMedication(user: AuthUser, medicationId: string) {
      const row = await ownedMedication(user, medicationId)
      await db.petMedication.delete({ where: { id: row.id } })
    },

    /** Histórico de saúde, mais recente primeiro. */
    async listRecords(user: AuthUser, petId: string): Promise<HealthRecord[]> {
      await assertOwner(user, petId)
      const rows = await db.petHealthRecord.findMany({
        where: { petId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      })
      return rows.map(toRecord)
    },

    async addRecord(
      user: AuthUser,
      petId: string,
      input: z.output<typeof healthRecordInputSchema>,
    ) {
      await assertOwner(user, petId)
      const row = await db.petHealthRecord.create({
        data: {
          petId,
          kind: input.kind,
          date: toDate(input.date),
          title: input.title,
          notes: input.notes,
          clinic: input.clinic,
          weightGrams: input.weightKg === null ? null : Math.round(input.weightKg * 1000),
        },
      })
      return toRecord(row)
    },

    async removeRecord(user: AuthUser, recordId: string) {
      const row = await db.petHealthRecord.findUnique({
        where: { id: recordId },
        select: { pet: { select: { ownerId: true } } },
      })
      if (!row) throw notFound('Registro')
      if (row.pet.ownerId !== user.id) throw forbidden()
      await db.petHealthRecord.delete({ where: { id: recordId } })
    },

    /** Reforços atrasados ou que vencem nos próximos dias, dos pets do usuário. */
    async reminders(user: AuthUser): Promise<VaccineReminder[]> {
      const now = new Date()
      const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const rows = await db.petVaccine.findMany({
        where: { pet: { ownerId: user.id, isActive: true } },
        include: { pet: { select: { name: true } } },
        orderBy: { appliedAt: 'desc' },
      })
      // Vale só a aplicação mais recente de cada vacina: reaplicou, o lembrete some
      const latest = new Map<string, (typeof rows)[number]>()
      for (const row of rows) {
        const key = `${row.petId}:${row.name.trim().toLowerCase()}`
        if (!latest.has(key)) latest.set(key, row)
      }
      const limit = today + VACCINE_REMINDER_DAYS * DAY_MS
      return [...latest.values()]
        .filter((row) => row.nextDueAt !== null && row.nextDueAt.getTime() <= limit)
        .map((row) => {
          const due = row.nextDueAt as Date
          return {
            vaccineId: row.id,
            petId: row.petId,
            petName: row.pet.name,
            vaccineName: row.name,
            nextDueAt: toDateOnly(due),
            daysLeft: Math.round((due.getTime() - today) / DAY_MS),
          }
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
    },
  }
}
