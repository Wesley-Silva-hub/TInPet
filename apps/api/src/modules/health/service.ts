import {
  VACCINE_REMINDER_DAYS,
  type Vaccine,
  type VaccineReminder,
  type vaccineInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { PetVaccine } from '../../generated/prisma/client'
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

/** Carteira de vacinação: dados de saúde, visíveis e editáveis só pelo tutor. */
export function createHealthService({ db }: AppDeps) {
  async function assertOwner(user: AuthUser, petId: string) {
    const pet = await db.pet.findUnique({ where: { id: petId }, select: { ownerId: true } })
    if (!pet) throw notFound('Pet')
    if (pet.ownerId !== user.id) throw forbidden('Só o tutor acessa a carteira de vacinação')
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
