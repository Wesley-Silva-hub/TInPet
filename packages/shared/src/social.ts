import { z } from 'zod'
import { paginationQuerySchema } from './common'
import { speciesSchema } from './pets'

export const MAX_CAPTION_LENGTH = 2200
export const MAX_COMMENT_LENGTH = 500

export const postAuthorSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
})
export type PostAuthor = z.infer<typeof postAuthorSchema>

export const commentSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  author: postAuthorSchema,
  content: z.string(),
  createdAt: z.string(),
  mine: z.boolean(),
})
export type Comment = z.infer<typeof commentSchema>

export const postSchema = z.object({
  id: z.uuid(),
  author: postAuthorSchema,
  pet: z.object({ id: z.uuid(), name: z.string(), species: speciesSchema }).nullable(),
  imageUrl: z.string(),
  caption: z.string(),
  createdAt: z.string(),
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  likedByMe: z.boolean(),
  mine: z.boolean(),
  /** Últimos comentários, para a prévia no card. */
  recentComments: z.array(commentSchema),
})
export type Post = z.infer<typeof postSchema>

export const postsQuerySchema = paginationQuerySchema.extend({
  authorId: z.uuid().optional(),
  petId: z.uuid().optional(),
  /** Só posts com esta hashtag (sem o #). */
  tag: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.replace(/^#/, '').toLocaleLowerCase('pt-BR'))
    .optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
})
export type PostsQuery = z.input<typeof postsQuerySchema>

/** Campos de texto que acompanham a imagem no multipart. */
export const postFieldsSchema = z.object({
  caption: z.string().trim().max(MAX_CAPTION_LENGTH).default(''),
  petId: z.uuid().nullable().default(null),
})

export const commentInputSchema = z.object({
  content: z.string().trim().min(1, 'Escreva um comentário').max(MAX_COMMENT_LENGTH),
})
export type CommentInput = z.infer<typeof commentInputSchema>

export const commentsQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const likeResultSchema = z.object({ likeCount: z.number().int(), likedByMe: z.boolean() })
export type LikeResult = z.infer<typeof likeResultSchema>

export const articleCategories = [
  'HEALTH',
  'BEHAVIOR',
  'ADOPTION',
  'NUTRITION',
  'CURIOSITIES',
  'EVENTS',
] as const
export const articleCategorySchema = z.enum(articleCategories)
export type ArticleCategory = z.infer<typeof articleCategorySchema>

export const articleCategoryLabels: Record<ArticleCategory, string> = {
  HEALTH: 'Saúde',
  BEHAVIOR: 'Comportamento',
  ADOPTION: 'Adoção',
  NUTRITION: 'Alimentação',
  CURIOSITIES: 'Curiosidades',
  EVENTS: 'Eventos',
}

export const articleSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: articleCategorySchema,
  coverUrl: z.string().nullable(),
  readMinutes: z.number().int(),
  publishedAt: z.string(),
})
export type ArticleSummary = z.infer<typeof articleSummarySchema>

export const articleSchema = articleSummarySchema.extend({ body: z.string() })
export type Article = z.infer<typeof articleSchema>

export const articlesQuerySchema = paginationQuerySchema.extend({
  category: articleCategorySchema.optional(),
})

/** Mesmo padrão do preenchimento na migration de hashtags (letras com acento, números e _). */
const HASHTAG_PATTERN = /#([0-9A-Za-zÀ-ÖØ-öø-ÿ_]{2,40})/g
export const MAX_HASHTAGS_PER_POST = 10

/** Hashtags da legenda, em minúsculas, sem repetir e na ordem em que aparecem. */
export function extractHashtags(caption: string): string[] {
  const tags = new Set<string>()
  for (const match of caption.matchAll(HASHTAG_PATTERN)) {
    tags.add((match[1] as string).toLocaleLowerCase('pt-BR'))
    if (tags.size === MAX_HASHTAGS_PER_POST) break
  }
  return [...tags]
}

/** Divide a legenda em trechos de texto e hashtags (com a posição no texto, boa para chave). */
export function splitHashtags(caption: string): { start: number; text: string; tag?: string }[] {
  const parts: { start: number; text: string; tag?: string }[] = []
  let last = 0
  for (const match of caption.matchAll(HASHTAG_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) parts.push({ start: last, text: caption.slice(last, index) })
    parts.push({
      start: index,
      text: match[0],
      tag: (match[1] as string).toLocaleLowerCase('pt-BR'),
    })
    last = index + match[0].length
  }
  if (last < caption.length) parts.push({ start: last, text: caption.slice(last) })
  return parts
}

export const hashtagParamsSchema = z.object({
  tag: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-zÀ-ÖØ-öø-ÿ_]{2,40}$/, 'Hashtag inválida')
    .transform((value) => value.toLocaleLowerCase('pt-BR')),
})

export const trendingHashtagSchema = z.object({ tag: z.string(), count: z.number().int() })
export type TrendingHashtag = z.infer<typeof trendingHashtagSchema>
