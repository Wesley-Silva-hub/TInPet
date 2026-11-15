import { nextDose } from '@tinpet/shared'
import type { NotificationType } from '../../generated/prisma/client'
import type { AppDeps } from '../../shared/context'
import { toDateOnly } from '../../shared/dto'
import { createNotifier } from '../notifications/service'
import { todayInBrazil } from './service'

const DAY_MS = 24 * 60 * 60 * 1000
/** Aviso de reforço chegando. */
const VACCINE_SOON_DAYS = 7
/** Vacina atrasada há mais que isso não gera aviso novo (evita lembrar algo esquecido de vez). */
const VACCINE_OVERDUE_DAYS = 3

interface Reminder {
  userId: string
  type: NotificationType
  petId: string
  preview: string
  dedupKey: string
}

const intervalText = (hours: number) =>
  hours % 24 === 0
    ? hours === 24
      ? '1 vez por dia'
      : `a cada ${hours / 24} dias`
    : `a cada ${hours} h`

/**
 * Cria os lembretes de saúde do dia: reforço de vacina (7 dias antes e no vencimento) e remédios
 * em uso. Idempotente: pode rodar a cada hora, cada aviso sai uma vez só. Retorna quantos saíram.
 */
export async function sendHealthReminders(deps: AppDeps, now = new Date()) {
  const { db } = deps
  const today = todayInBrazil(now)
  const todayUtc = Date.parse(`${today}T00:00:00Z`)
  const reminders: Reminder[] = []
  const owner = { isActive: true, owner: { suspendedAt: null } }

  // Vacinas: vale só a aplicação mais recente de cada vacina de cada pet
  const vaccines = await db.petVaccine.findMany({
    where: {
      pet: owner,
      nextDueAt: {
        gte: new Date(todayUtc - VACCINE_OVERDUE_DAYS * DAY_MS),
        lte: new Date(todayUtc + VACCINE_SOON_DAYS * DAY_MS),
      },
    },
    include: { pet: { select: { name: true, ownerId: true } } },
  })
  const latestApplied = await db.petVaccine.findMany({
    where: { petId: { in: [...new Set(vaccines.map((row) => row.petId))] } },
    select: { petId: true, name: true, appliedAt: true },
  })
  const newest = new Map<string, number>()
  for (const row of latestApplied) {
    const key = `${row.petId}:${row.name.trim().toLowerCase()}`
    newest.set(key, Math.max(newest.get(key) ?? 0, row.appliedAt.getTime()))
  }
  for (const vaccine of vaccines) {
    const key = `${vaccine.petId}:${vaccine.name.trim().toLowerCase()}`
    // Já reaplicou depois desta dose: o reforço desta não vale mais
    if ((newest.get(key) ?? 0) > vaccine.appliedAt.getTime()) continue
    const due = vaccine.nextDueAt as Date
    const daysLeft = Math.round((due.getTime() - todayUtc) / DAY_MS)
    const stage = daysLeft > 0 ? 'soon' : 'due'
    const when =
      daysLeft > 1
        ? `vence em ${daysLeft} dias`
        : daysLeft === 1
          ? 'vence amanhã'
          : daysLeft === 0
            ? 'vence hoje'
            : 'está atrasada'
    reminders.push({
      userId: vaccine.pet.ownerId,
      type: 'VACCINE_DUE',
      petId: vaccine.petId,
      preview: `${vaccine.name} de ${vaccine.pet.name} ${when} (${toDateOnly(due).split('-').reverse().join('/')})`,
      dedupKey: `vaccine:${vaccine.id}:${stage}`,
    })
  }

  // Remédios em uso hoje: um aviso por remédio por dia
  const endOfToday = new Date(`${today}T23:59:59-03:00`)
  const medications = await db.petMedication.findMany({
    where: {
      pet: owner,
      firstDoseAt: { lte: endOfToday },
      OR: [{ endsOn: null }, { endsOn: { gte: new Date(todayUtc) } }],
    },
    include: { pet: { select: { name: true, ownerId: true } } },
  })
  // Começo do dia: se a API acordar à tarde, o remédio do dia ainda é avisado
  const startOfToday = new Date(`${today}T00:00:00-03:00`)
  for (const medication of medications) {
    const next = nextDose(medication, startOfToday)
    if (!next || next > endOfToday) continue
    const dosage = medication.dosage ? ` ${medication.dosage}` : ''
    reminders.push({
      userId: medication.pet.ownerId,
      type: 'MEDICATION_TODAY',
      petId: medication.petId,
      preview: `${medication.pet.name}: ${medication.name}${dosage}, ${intervalText(medication.everyHours)}`,
      dedupKey: `medication:${medication.id}:${today}`,
    })
  }

  return createNotifier(deps).remind(reminders)
}
