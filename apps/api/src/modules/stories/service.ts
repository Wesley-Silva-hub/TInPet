import {
  MAX_ACTIVE_STORIES,
  STORY_TTL_HOURS,
  type StoryGroup,
  type storyFieldsSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { badRequest, forbidden, notFound } from '../../shared/errors'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

const HOUR_MS = 60 * 60 * 1000
/** Pessoas com story na barra do Início. */
const MAX_GROUPS = 40

/** Stories no ar de quem o usuário pode ver (sem bloqueio nos dois sentidos, conta ativa). */
const visibleTo = (viewerId: string, now: Date) =>
  ({
    expiresAt: { gt: now },
    author: {
      suspendedAt: null,
      blocksMade: { none: { blockedId: viewerId } },
      blocksReceived: { none: { blockerId: viewerId } },
    },
  }) satisfies Prisma.StoryWhereInput

/** Apaga stories vencidos e as fotos no storage. Retorna quantos saíram. */
export async function cleanupExpiredStories({ db, storage }: AppDeps, now = new Date()) {
  const expired = await db.story.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, imageKey: true },
    take: 1000,
  })
  if (expired.length === 0) return 0
  await db.story.deleteMany({ where: { id: { in: expired.map((story) => story.id) } } })
  await storage.delete(expired.map((story) => story.imageKey))
  return expired.length
}

export function createStoryService({ db, storage }: AppDeps) {
  return {
    /** Agrupa por pessoa: os meus primeiro, depois quem tem story não visto, mais recentes antes. */
    async list(user: AuthUser): Promise<StoryGroup[]> {
      const now = new Date()
      const rows = await db.story.findMany({
        where: visibleTo(user.id, now),
        include: {
          author: { select: { id: true, name: true, avatarKey: true } },
          pet: { select: { id: true, name: true } },
          views: { where: { viewerId: user.id }, select: { viewerId: true } },
          _count: { select: { views: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      })
      const groups = new Map<string, StoryGroup & { latest: number }>()
      for (const row of rows) {
        const isMine = row.authorId === user.id
        const group = groups.get(row.authorId) ?? {
          author: {
            id: row.author.id,
            name: row.author.name,
            avatarUrl: row.author.avatarKey ? storage.publicUrl(row.author.avatarKey) : null,
          },
          isMine,
          allSeen: true,
          items: [],
          latest: 0,
        }
        const seen = isMine || row.views.length > 0
        group.items.push({
          id: row.id,
          imageUrl: storage.publicUrl(row.imageKey),
          caption: row.caption,
          pet: row.pet,
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          seen,
          viewCount: isMine ? row._count.views : null,
        })
        group.allSeen &&= seen
        group.latest = row.createdAt.getTime()
        groups.set(row.authorId, group)
      }
      return [...groups.values()]
        .sort(
          (a, b) =>
            Number(b.isMine) - Number(a.isMine) ||
            Number(a.allSeen) - Number(b.allSeen) ||
            b.latest - a.latest,
        )
        .slice(0, MAX_GROUPS)
        .map(({ latest: _latest, ...group }) => group)
    },

    async create(user: AuthUser, file: Buffer, fields: z.output<typeof storyFieldsSchema>) {
      if (user.role !== 'OWNER') throw forbidden('Apenas tutores publicam stories')
      const now = new Date()
      const active = await db.story.count({
        where: { authorId: user.id, expiresAt: { gt: now } },
      })
      if (active >= MAX_ACTIVE_STORIES) {
        throw badRequest('STORY_LIMIT', `Você já tem ${MAX_ACTIVE_STORIES} stories no ar`)
      }
      if (fields.petId) {
        const pet = await db.pet.findUnique({
          where: { id: fields.petId },
          select: { ownerId: true },
        })
        if (!pet || pet.ownerId !== user.id) {
          throw badRequest('INVALID_PET', 'Escolha um dos seus pets')
        }
      }
      const image = await processImage(file, 1080)
      const key = newStorageKey(`stories/${user.id}`, 'webp')
      await storage.put(key, image, 'image/webp')
      const story = await db.story.create({
        data: {
          authorId: user.id,
          petId: fields.petId,
          caption: fields.caption,
          imageKey: key,
          expiresAt: new Date(now.getTime() + STORY_TTL_HOURS * HOUR_MS),
        },
      })
      return { id: story.id, expiresAt: story.expiresAt.toISOString() }
    },

    /** Marca como visto (idempotente). O próprio autor não conta. */
    async view(user: AuthUser, storyId: string) {
      const story = await db.story.findFirst({
        where: { id: storyId, ...visibleTo(user.id, new Date()) },
        select: { authorId: true },
      })
      if (!story) throw notFound('Story')
      if (story.authorId === user.id) return
      await db.storyView.upsert({
        where: { storyId_viewerId: { storyId, viewerId: user.id } },
        create: { storyId, viewerId: user.id },
        update: {},
      })
    },

    async remove(user: AuthUser, storyId: string) {
      const story = await db.story.findUnique({ where: { id: storyId } })
      if (!story) throw notFound('Story')
      if (story.authorId !== user.id) throw forbidden('Só o autor pode apagar o story')
      await db.story.delete({ where: { id: storyId } })
      await storage.delete([story.imageKey])
    },
  }
}
