import type { ModerationReport, moderationReportsQuerySchema, Page } from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { type AuthUser, requireRole } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor } from '../../shared/dto'
import { badRequest, notFound } from '../../shared/errors'

interface TimeCursor {
  t: string
  id: string
}
const isTimeCursor = (value: unknown): value is TimeCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TimeCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as TimeCursor).t)) &&
  typeof (value as TimeCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as TimeCursor).id)

const userSelect = { id: true, name: true, avatarKey: true } as const

const reportInclude = {
  reporter: { select: userSelect },
  reported: {
    select: {
      ...userSelect,
      suspendedAt: true,
      _count: { select: { reportsAgainst: { where: { resolvedAt: null } } } },
    },
  },
} satisfies Prisma.ReportInclude

/** Painel de moderação: só ADMIN lista denúncias, resolve e suspende contas. */
export function createModerationService({ db, storage }: AppDeps) {
  const avatarUrl = (key: string | null) => (key ? storage.publicUrl(key) : null)

  async function assertModeratable(admin: AuthUser, userId: string) {
    if (userId === admin.id) throw badRequest('SELF_TARGET', 'Ação não permitida em si mesmo')
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!target) throw notFound('Usuário')
    if (target.role === 'ADMIN') {
      throw badRequest('ADMIN_TARGET', 'Não é possível suspender outro moderador')
    }
  }

  return {
    async listReports(
      admin: AuthUser,
      query: z.output<typeof moderationReportsQuerySchema>,
    ): Promise<Page<ModerationReport>> {
      requireRole(admin, 'ADMIN')
      const cursor = decodeCursor(query.cursor, isTimeCursor)
      const rows = await db.report.findMany({
        where: {
          resolvedAt: query.status === 'open' ? null : { not: null },
          ...(cursor && {
            OR: [
              { createdAt: { lt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }),
        },
        include: reportInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((row) => ({
          id: row.id,
          reason: row.reason,
          details: row.details,
          createdAt: row.createdAt.toISOString(),
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
          reporter: row.reporter && {
            id: row.reporter.id,
            name: row.reporter.name,
            avatarUrl: avatarUrl(row.reporter.avatarKey),
          },
          reported: {
            id: row.reported.id,
            name: row.reported.name,
            avatarUrl: avatarUrl(row.reported.avatarKey),
            suspended: row.reported.suspendedAt !== null,
            openReports: row.reported._count.reportsAgainst,
          },
        })),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async resolveReport(admin: AuthUser, reportId: string) {
      requireRole(admin, 'ADMIN')
      const { count } = await db.report.updateMany({
        where: { id: reportId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      })
      if (count === 0 && !(await db.report.count({ where: { id: reportId } }))) {
        throw notFound('Denúncia')
      }
    },

    /** Suspende: derruba todas as sessões e encerra as denúncias abertas contra a conta. */
    async suspend(admin: AuthUser, userId: string) {
      requireRole(admin, 'ADMIN')
      await assertModeratable(admin, userId)
      const now = new Date()
      await db.$transaction([
        db.user.update({ where: { id: userId }, data: { suspendedAt: now } }),
        db.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        }),
        db.report.updateMany({
          where: { reportedId: userId, resolvedAt: null },
          data: { resolvedAt: now },
        }),
      ])
    },

    async reactivate(admin: AuthUser, userId: string) {
      requireRole(admin, 'ADMIN')
      await assertModeratable(admin, userId)
      await db.user.update({ where: { id: userId }, data: { suspendedAt: null } })
    },
  }
}
