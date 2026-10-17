import type { ArticleSummary, articlesQuerySchema, Page } from '@tinpet/shared'
import type { z } from 'zod'
import type { Article as ArticleRow } from '../../generated/prisma/client'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor } from '../../shared/dto'
import { notFound } from '../../shared/errors'

interface NewsCursor {
  t: string
  id: string
}
const isNewsCursor = (value: unknown): value is NewsCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as NewsCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as NewsCursor).t)) &&
  typeof (value as NewsCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as NewsCursor).id)

export function createNewsService({ db, storage }: AppDeps) {
  const toSummary = (article: ArticleRow): ArticleSummary => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    category: article.category,
    coverUrl: article.coverKey ? storage.publicUrl(article.coverKey) : null,
    readMinutes: article.readMinutes,
    publishedAt: article.publishedAt.toISOString(),
  })

  return {
    /** Artigos já publicados, mais recentes primeiro. */
    async list(query: z.output<typeof articlesQuerySchema>): Promise<Page<ArticleSummary>> {
      const cursor = decodeCursor(query.cursor, isNewsCursor)
      const rows = await db.article.findMany({
        where: {
          category: query.category,
          publishedAt: { lte: new Date() },
          ...(cursor && {
            OR: [
              { publishedAt: { lt: new Date(cursor.t) } },
              { publishedAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }),
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toSummary),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.publishedAt.toISOString(), id: last.id })
            : null,
      }
    },

    async get(slug: string) {
      const article = await db.article.findFirst({
        where: { slug, publishedAt: { lte: new Date() } },
      })
      if (!article) throw notFound('Artigo')
      return { ...toSummary(article), body: article.body }
    },
  }
}
