import { useQuery } from '@tanstack/react-query'
import { type Article, articleCategoryLabels } from '@tinpet/shared'
import { ArrowLeft, Clock } from 'lucide-react'
import { motion, useScroll, useSpring } from 'motion/react'
import { Link, useParams } from 'react-router'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { api } from '../../lib/api'

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Corpo em texto simples: parágrafos separados por linha em branco; "## " vira subtítulo. */
function ArticleBody({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-5 text-lg leading-relaxed">
      {body.split(/\n{2,}/).map((block) =>
        block.startsWith('## ') ? (
          <h2 key={block} className="mt-4 text-2xl font-semibold">
            {block.slice(3)}
          </h2>
        ) : (
          <p key={block} className="whitespace-pre-line">
            {block}
          </p>
        ),
      )}
    </div>
  )
}

export function ArticlePage() {
  const { slug } = useParams() as { slug: string }
  const article = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api<Article>(`/articles/${slug}`),
  })
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-brand-500"
      />
      <Link
        to="/noticias"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Notícias
      </Link>
      {article.isPending && (
        <>
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </>
      )}
      {article.isError && <ErrorState error={article.error} onRetry={() => article.refetch()} />}
      {article.data && (
        <>
          <header className="flex flex-col gap-3">
            <span className="text-sm font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
              {articleCategoryLabels[article.data.category]}
            </span>
            <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
              {article.data.title}
            </h1>
            <p className="text-xl text-muted">{article.data.summary}</p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Clock className="size-4" aria-hidden /> {article.data.readMinutes} min de leitura ·{' '}
              {dateFormat.format(new Date(article.data.publishedAt))}
            </p>
          </header>
          {article.data.coverUrl && (
            <motion.img
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              src={article.data.coverUrl}
              alt=""
              className="aspect-[16/9] w-full rounded-card object-cover"
            />
          )}
          <ArticleBody body={article.data.body} />
          <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
            Conteúdo informativo da equipe TinPet. Em caso de dúvida sobre a saúde do seu pet,
            procure um médico-veterinário.
          </p>
        </>
      )}
    </article>
  )
}
