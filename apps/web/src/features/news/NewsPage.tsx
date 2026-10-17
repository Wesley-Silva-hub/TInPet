import { useInfiniteQuery } from '@tanstack/react-query'
import {
  type ArticleCategory,
  type ArticleSummary,
  articleCategories,
  articleCategoryLabels,
  type Page,
} from '@tinpet/shared'
import { Clock, Newspaper } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { timeAgo } from '../../lib/time'

export function NewsPage() {
  const [category, setCategory] = useState<ArticleCategory | undefined>()
  const reduceMotion = useReducedMotion()
  const news = useInfiniteQuery({
    queryKey: ['articles', category ?? 'all'],
    queryFn: ({ pageParam }) =>
      api<Page<ArticleSummary>>('/articles', { query: { category, cursor: pageParam, limit: 9 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const items = news.data?.pages.flatMap((page) => page.items) ?? []
  const [featured, ...rest] = items

  const chip = (value: ArticleCategory | undefined, label: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={category === value}
      onClick={() => setCategory(value)}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        category === value ? 'bg-brand-500 text-white' : 'bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notícias e dicas" />
      <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <legend className="sr-only">Categorias</legend>
        {chip(undefined, 'Tudo')}
        {articleCategories.map((value) => chip(value, articleCategoryLabels[value]))}
      </fieldset>

      {news.isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      )}
      {news.isError && <ErrorState error={news.error} onRetry={() => news.refetch()} />}
      {news.isSuccess && items.length === 0 && (
        <EmptyState icon={<Newspaper className="size-8" />} title="Nada por aqui ainda">
          Volte em breve para novidades.
        </EmptyState>
      )}

      {featured && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to={`/noticias/${featured.slug}`}
            className="group relative block overflow-hidden rounded-card bg-surface-2"
          >
            {featured.coverUrl && (
              <img
                src={featured.coverUrl}
                alt=""
                className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105 sm:aspect-[16/8]"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-6 pt-24 text-white sm:p-8">
              <span className="self-start rounded-full bg-brand-500 px-3 py-1 text-xs font-bold tracking-wide uppercase">
                {articleCategoryLabels[featured.category]}
              </span>
              <h2 className="text-2xl font-semibold sm:text-4xl">{featured.title}</h2>
              <p className="line-clamp-2 opacity-90">{featured.summary}</p>
            </div>
          </Link>
        </motion.div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((article, index) => (
          <motion.li
            key={article.id}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (index % 3) * 0.06 }}
          >
            <ArticleCard article={article} />
          </motion.li>
        ))}
      </ul>
      <InfiniteSentinel
        hasMore={Boolean(news.hasNextPage)}
        loading={news.isFetchingNextPage}
        onLoadMore={() => news.fetchNextPage()}
      />
    </div>
  )
}

function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link
      to={`/noticias/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition hover:-translate-y-1 hover:shadow-xl"
    >
      {article.coverUrl && (
        <div className="overflow-hidden">
          <img
            src={article.coverUrl}
            alt=""
            loading="lazy"
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
          {articleCategoryLabels[article.category]}
        </span>
        <h3 className="font-sans text-lg font-bold leading-snug">{article.title}</h3>
        <p className="line-clamp-3 text-sm text-muted">{article.summary}</p>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden /> {article.readMinutes} min de leitura ·{' '}
          {timeAgo(article.publishedAt)}
        </p>
      </div>
    </Link>
  )
}
