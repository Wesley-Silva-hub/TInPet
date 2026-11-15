import {
  RANKING_DAYS,
  RANKING_LIMIT,
  RANKING_RADIUS_KM,
  type Ranking,
  type rankingQuerySchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { distanceKm } from '../../shared/geo'

const DAY_MS = 24 * 60 * 60 * 1000
/** Candidatos lidos do banco antes do filtro de distância (os mais curtidos em geral). */
const CANDIDATES = 300

/**
 * Pets mais curtidos da região: soma das curtidas recebidas pelas publicações de cada pet nos
 * últimos 30 dias, só de tutores a até 50 km (sem localização, o ranking é geral). Respeita
 * bloqueios e esconde contas suspensas e pets inativos.
 */
export function createRankingService({ db, storage }: AppDeps) {
  return {
    async ranking(user: AuthUser, query: z.output<typeof rankingQuerySchema>): Promise<Ranking> {
      const since = new Date(Date.now() - RANKING_DAYS * DAY_MS)
      const viewer = await db.user.findUnique({
        where: { id: user.id },
        select: { latitude: true, longitude: true },
      })
      const regional = viewer?.latitude != null && viewer.longitude != null

      const grouped = await db.postLike.groupBy({
        by: ['postId'],
        where: {
          createdAt: { gte: since },
          post: {
            pet: { isActive: true, ...(query.species && { species: query.species }) },
            author: {
              suspendedAt: null,
              blocksMade: { none: { blockedId: user.id } },
              blocksReceived: { none: { blockerId: user.id } },
            },
          },
        },
        _count: { _all: true },
      })
      if (grouped.length === 0) return { scope: regional ? 'region' : 'everywhere', items: [] }

      const posts = await db.post.findMany({
        where: { id: { in: grouped.map((group) => group.postId) } },
        select: { id: true, petId: true },
      })
      const likesByPost = new Map(grouped.map((group) => [group.postId, group._count._all]))
      const totals = new Map<string, { likes: number; posts: number }>()
      for (const post of posts) {
        if (!post.petId) continue
        const total = totals.get(post.petId) ?? { likes: 0, posts: 0 }
        total.likes += likesByPost.get(post.id) ?? 0
        total.posts += 1
        totals.set(post.petId, total)
      }
      const candidates = [...totals.entries()]
        .sort((a, b) => b[1].likes - a[1].likes)
        .slice(0, CANDIDATES)

      const pets = await db.pet.findMany({
        where: { id: { in: candidates.map(([petId]) => petId) } },
        select: {
          id: true,
          name: true,
          species: true,
          breed: { select: { name: true } },
          photos: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
          owner: { select: { id: true, name: true, latitude: true, longitude: true } },
        },
      })
      const petById = new Map(pets.map((pet) => [pet.id, pet]))

      const items = candidates
        .flatMap(([petId, total]) => {
          const pet = petById.get(petId)
          if (!pet) return []
          const km = distanceKm(viewer, pet.owner)
          const isMine = pet.owner.id === user.id
          if (regional && !isMine && (km === null || km > RANKING_RADIUS_KM)) return []
          const photo = pet.photos[0]?.storageKey
          return [
            {
              pet: {
                id: pet.id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed?.name ?? null,
                photoUrl: photo ? storage.publicUrl(photo) : null,
              },
              owner: { id: pet.owner.id, name: pet.owner.name },
              likes: total.likes,
              posts: total.posts,
              distanceKm: isMine ? null : km,
              isMine,
            },
          ]
        })
        // Empate: quem precisou de menos publicações fica na frente, depois o nome
        .sort(
          (a, b) =>
            b.likes - a.likes || a.posts - b.posts || a.pet.name.localeCompare(b.pet.name, 'pt-BR'),
        )
        .slice(0, RANKING_LIMIT)
        .map((item, index) => ({ position: index + 1, ...item }))

      return { scope: regional ? 'region' : 'everywhere', items }
    },
  }
}
