import type { reportInputSchema } from '@tinpet/shared'
import type { z } from 'zod'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { badRequest, notFound } from '../../shared/errors'

export function createSafetyService({ db }: AppDeps) {
  async function assertOtherUser(user: AuthUser, targetId: string) {
    if (targetId === user.id) throw badRequest('SELF_TARGET', 'Ação não permitida em si mesmo')
    const exists = await db.user.count({ where: { id: targetId } })
    if (!exists) throw notFound('Usuário')
  }

  return {
    /** Bloqueio esconde os dois lados do feed, perfis e conversas, e desfaz matches existentes. */
    async block(user: AuthUser, targetId: string) {
      await assertOtherUser(user, targetId)
      await db.$transaction([
        db.block.upsert({
          where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
          create: { blockerId: user.id, blockedId: targetId },
          update: {},
        }),
        db.match.updateMany({
          where: {
            unmatchedAt: null,
            OR: [
              { petA: { ownerId: user.id }, petB: { ownerId: targetId } },
              { petA: { ownerId: targetId }, petB: { ownerId: user.id } },
            ],
          },
          data: { unmatchedAt: new Date() },
        }),
      ])
    },

    async unblock(user: AuthUser, targetId: string) {
      await db.block.deleteMany({ where: { blockerId: user.id, blockedId: targetId } })
    },

    async report(user: AuthUser, targetId: string, input: z.output<typeof reportInputSchema>) {
      await assertOtherUser(user, targetId)
      await db.report.create({
        data: { reporterId: user.id, reportedId: targetId, ...input },
      })
    },
  }
}
