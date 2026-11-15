import { healthRecordKindLabels, type Timeline, type TimelineItem } from '@tinpet/shared'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { notFound } from '../../shared/errors'

const POSTS_LIMIT = 120
const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/**
 * Linha do tempo do pet (o "PetMemories" do Notion): marcos e fotos em ordem, do mais recente
 * para o mais antigo. Quem não é o tutor vê só o que já é público (nascimento, chegada, posts e
 * o reencontro de um pet perdido); dados de saúde e matches ficam só com o tutor.
 */
export function createTimelineService({ db, storage }: AppDeps) {
  return {
    async timeline(user: AuthUser, petId: string): Promise<Timeline> {
      const pet = await db.pet.findFirst({
        where: {
          id: petId,
          owner: {
            suspendedAt: null,
            blocksMade: { none: { blockedId: user.id } },
            blocksReceived: { none: { blockerId: user.id } },
          },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          isActive: true,
          birthDate: true,
          createdAt: true,
        },
      })
      if (!pet || (!pet.isActive && pet.ownerId !== user.id)) throw notFound('Pet')
      const isMine = pet.ownerId === user.id

      const [posts, found, vaccines, records, firstMatch] = await Promise.all([
        db.post.findMany({
          where: { petId },
          select: { id: true, caption: true, imageKey: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: POSTS_LIMIT,
        }),
        db.lostPetAlert.findMany({
          where: { petId, status: 'FOUND', resolvedAt: { not: null } },
          select: { id: true, resolvedAt: true, neighborhood: true },
        }),
        isMine
          ? db.petVaccine.findMany({
              where: { petId },
              select: { id: true, name: true, appliedAt: true, clinic: true },
            })
          : Promise.resolve([]),
        isMine
          ? db.petHealthRecord.findMany({
              where: { petId },
              select: {
                id: true,
                kind: true,
                date: true,
                title: true,
                clinic: true,
                weightGrams: true,
              },
            })
          : Promise.resolve([]),
        isMine
          ? db.match.findFirst({
              where: { OR: [{ petAId: petId }, { petBId: petId }] },
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                createdAt: true,
                petAId: true,
                petA: { select: { name: true } },
                petB: { select: { name: true } },
              },
            })
          : Promise.resolve(null),
      ])

      const items: TimelineItem[] = []
      if (pet.birthDate) {
        items.push({
          id: `birth-${pet.id}`,
          kind: 'BIRTH',
          date: pet.birthDate.toISOString(),
          title: `${pet.name} nasceu`,
          detail: '',
          imageUrl: null,
          to: null,
        })
      }
      items.push({
        id: `joined-${pet.id}`,
        kind: 'JOINED',
        date: pet.createdAt.toISOString(),
        title: 'Chegou ao TinPet',
        detail: '',
        imageUrl: null,
        to: null,
      })
      for (const post of posts) {
        items.push({
          id: `post-${post.id}`,
          kind: 'POST',
          date: post.createdAt.toISOString(),
          title: 'Nova foto',
          detail: post.caption.slice(0, 140),
          imageUrl: storage.publicUrl(post.imageKey),
          to: `/posts/${post.id}`,
        })
      }
      for (const alert of found) {
        items.push({
          id: `found-${alert.id}`,
          kind: 'FOUND',
          date: (alert.resolvedAt as Date).toISOString(),
          title: 'Voltou para casa! 💛',
          detail: alert.neighborhood ? `Reencontrado perto de ${alert.neighborhood}` : '',
          imageUrl: null,
          to: `/perdidos/${alert.id}`,
        })
      }
      for (const vaccine of vaccines) {
        items.push({
          id: `vaccine-${vaccine.id}`,
          kind: 'VACCINE',
          date: vaccine.appliedAt.toISOString(),
          title: `Vacina: ${vaccine.name}`,
          detail: vaccine.clinic,
          imageUrl: null,
          to: null,
        })
      }
      for (const record of records) {
        const weight = record.kind === 'WEIGHT' && record.weightGrams !== null
        items.push({
          id: `health-${record.id}`,
          kind: weight ? 'WEIGHT' : 'HEALTH',
          date: record.date.toISOString(),
          title: weight
            ? `Pesou ${kg.format((record.weightGrams as number) / 1000)} kg`
            : `${healthRecordKindLabels[record.kind]}: ${record.title}`,
          detail: record.clinic,
          imageUrl: null,
          to: null,
        })
      }
      if (firstMatch) {
        const other = firstMatch.petAId === petId ? firstMatch.petB.name : firstMatch.petA.name
        items.push({
          id: `match-${firstMatch.id}`,
          kind: 'FIRST_MATCH',
          date: firstMatch.createdAt.toISOString(),
          title: `Primeiro match: ${other}`,
          detail: '',
          imageUrl: null,
          to: `/matches/${firstMatch.id}`,
        })
      }

      items.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      return { isMine, items }
    },
  }
}
