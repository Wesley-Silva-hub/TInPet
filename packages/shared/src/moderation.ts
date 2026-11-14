import { z } from 'zod'
import { paginationQuerySchema } from './common'
import { reportReasons } from './matching'

export const reportStatuses = ['open', 'resolved'] as const

export const moderationReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(reportStatuses).default('open'),
})
export type ModerationReportsQuery = z.input<typeof moderationReportsQuerySchema>

const moderationUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
})

/** Denúncia vista pela moderação. Sem e-mail nem localização de ninguém. */
export const moderationReportSchema = z.object({
  id: z.uuid(),
  reason: z.enum(reportReasons),
  details: z.string(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  /** Nulo quando quem denunciou já excluiu a conta. */
  reporter: moderationUserSchema.nullable(),
  reported: moderationUserSchema.extend({
    suspended: z.boolean(),
    /** Denúncias ainda abertas contra a mesma pessoa (ajuda a priorizar). */
    openReports: z.number().int(),
  }),
})
export type ModerationReport = z.infer<typeof moderationReportSchema>
