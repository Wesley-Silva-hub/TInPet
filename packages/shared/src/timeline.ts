import { z } from 'zod'

/** Marcos da vida do pet. Vacinas, saúde, peso e matches só aparecem para o tutor. */
export const timelineKinds = [
  'BIRTH',
  'JOINED',
  'POST',
  'VACCINE',
  'HEALTH',
  'WEIGHT',
  'FIRST_MATCH',
  'FOUND',
] as const
export const timelineKindSchema = z.enum(timelineKinds)
export type TimelineKind = z.infer<typeof timelineKindSchema>

export const timelineItemSchema = z.object({
  id: z.string(),
  kind: timelineKindSchema,
  /** ISO; datas sem hora (nascimento, vacina) vêm à meia-noite UTC. */
  date: z.string(),
  title: z.string(),
  detail: z.string(),
  imageUrl: z.string().nullable(),
  /** Para onde o item leva no app (post, match, alerta). */
  to: z.string().nullable(),
})
export type TimelineItem = z.infer<typeof timelineItemSchema>

export const timelineSchema = z.object({
  isMine: z.boolean(),
  items: z.array(timelineItemSchema),
})
export type Timeline = z.infer<typeof timelineSchema>
