import {
  articleSchema,
  articleSummarySchema,
  articlesQuerySchema,
  pageSchema,
} from '@tinpet/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createNewsService } from './service'

/** Notícias são públicas: aparecem também para quem ainda não entrou. */
export const newsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createNewsService(app.deps)
  const tags = ['news']

  app.get(
    '/articles',
    {
      schema: {
        tags,
        querystring: articlesQuerySchema,
        response: { 200: pageSchema(articleSummarySchema) },
      },
    },
    (request) => service.list(request.query),
  )

  app.get(
    '/articles/:slug',
    {
      schema: {
        tags,
        params: z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }),
        response: { 200: articleSchema },
      },
    },
    (request) => service.get(request.params.slug),
  )
}
