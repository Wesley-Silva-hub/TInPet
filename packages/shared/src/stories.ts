import { z } from 'zod'

export const STORY_TTL_HOURS = 24
export const MAX_ACTIVE_STORIES = 10
export const MAX_STORY_CAPTION = 150

/** Campos de texto que acompanham a foto no multipart. */
export const storyFieldsSchema = z.object({
  caption: z.string().trim().max(MAX_STORY_CAPTION).default(''),
  petId: z.uuid().nullable().default(null),
})

export const storySchema = z.object({
  id: z.uuid(),
  imageUrl: z.string(),
  caption: z.string(),
  pet: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
  seen: z.boolean(),
  /** Só para o autor: quantas pessoas viram. */
  viewCount: z.number().int().nullable(),
})
export type Story = z.infer<typeof storySchema>

/** Stories agrupados por pessoa, como na barra do Início. */
export const storyGroupSchema = z.object({
  author: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }),
  isMine: z.boolean(),
  allSeen: z.boolean(),
  items: z.array(storySchema),
})
export type StoryGroup = z.infer<typeof storyGroupSchema>
