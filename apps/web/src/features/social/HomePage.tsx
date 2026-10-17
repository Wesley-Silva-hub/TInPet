import { useQuery } from '@tanstack/react-query'
import {
  type ArticleSummary,
  articleCategoryLabels,
  type Page,
  type Post,
  type VaccineReminder,
} from '@tinpet/shared'
import { Camera, Flame, Heart, Newspaper, Syringe } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { PetAvatar } from '../../components/ui/PetAvatar'
import { PostSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { PostCard } from './PostCard'
import { usePosts } from './queries'

export function HomePage() {
  const me = useMe()
  const posts = usePosts()
  const items = posts.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-muted">Olá, {me.name.split(' ')[0]} 👋</p>
          <h1 className="text-3xl font-semibold">O que rola na comunidade</h1>
        </div>
        <Link
          to="/publicar"
          className="hidden items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 font-semibold text-white shadow-md shadow-brand-500/30 hover:bg-brand-600 sm:inline-flex"
        >
          <Camera className="size-5" aria-hidden /> Publicar
        </Link>
      </header>

      <VaccineReminders />
      {items.length > 0 && <PetHighlights posts={items} />}
      <Trending />
      <NewsStrip />

      {posts.isPending && (
        <div className="flex flex-col gap-6">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}
      {posts.isError && <ErrorState error={posts.error} onRetry={() => posts.refetch()} />}
      {posts.isSuccess && items.length === 0 && (
        <EmptyState icon={<Camera className="size-8" />} title="Nenhuma publicação ainda">
          <Link to="/publicar" className="font-semibold text-brand-600 underline">
            Compartilhe a primeira foto do seu pet
          </Link>
        </EmptyState>
      )}
      <div className="flex flex-col gap-6">
        {items.map((post, index) => (
          <PostCard key={post.id} post={post} priority={index < 2} />
        ))}
      </div>
      <InfiniteSentinel
        hasMore={Boolean(posts.hasNextPage)}
        loading={posts.isFetchingNextPage}
        onLoadMore={() => posts.fetchNextPage()}
      />
      {posts.isSuccess && !posts.hasNextPage && items.length > 0 && (
        <p className="pb-4 text-center text-muted">Você está em dia 🐾</p>
      )}
    </div>
  )
}

/** Pets das publicações recentes, em círculos como os stories. */
function PetHighlights({ posts }: { posts: Post[] }) {
  const reduceMotion = useReducedMotion()
  const seen = new Set<string>()
  const highlights = posts.filter((post) => {
    if (!post.pet || seen.has(post.pet.id)) return false
    seen.add(post.pet.id)
    return true
  })
  if (highlights.length === 0) return null

  return (
    <section aria-label="Pets em destaque" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-4 pb-1">
        {highlights.map((post, index) => (
          <motion.li
            key={post.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            className="shrink-0"
          >
            <Link
              to={`/pets/${post.pet?.id}`}
              className="flex w-20 flex-col items-center gap-1.5 text-center"
            >
              <span className="transition hover:scale-105">
                <PetAvatar
                  petSrc={post.imageUrl}
                  ownerSrc={post.author.avatarUrl}
                  ownerName={post.author.name}
                />
              </span>
              <span className="w-full truncate text-sm font-semibold">{post.pet?.name}</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

function NewsStrip() {
  const news = useQuery({
    queryKey: ['articles', 'strip'],
    queryFn: () => api<Page<ArticleSummary>>('/articles', { query: { limit: 6 } }),
    staleTime: 5 * 60_000,
  })
  if (!news.data?.items.length) return null

  return (
    <section aria-labelledby="noticias-inicio" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="noticias-inicio" className="flex items-center gap-2 text-xl font-semibold">
          <Newspaper className="size-5 text-brand-500" aria-hidden /> Notícias e dicas
        </h2>
        <Link to="/noticias" className="font-semibold text-brand-600">
          Ver todas
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {news.data.items.map((article) => (
          <li key={article.id} className="w-64 shrink-0 snap-start">
            <Link
              to={`/noticias/${article.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition hover:-translate-y-1 hover:shadow-lg"
            >
              {article.coverUrl && (
                <img
                  src={article.coverUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              <div className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
                  {articleCategoryLabels[article.category]}
                </span>
                <h3 className="line-clamp-2 font-sans text-base font-bold leading-snug">
                  {article.title}
                </h3>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Reforços de vacina atrasados ou chegando (só aparece quando há algum). */
function VaccineReminders() {
  const reminders = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api<VaccineReminder[]>('/me/vaccine-reminders'),
    staleTime: 10 * 60_000,
  })
  if (!reminders.data?.length) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="lembretes"
      className="flex flex-col gap-2 rounded-card border border-sun-400/60 bg-sun-400/15 p-4"
    >
      <h2 id="lembretes" className="flex items-center gap-2 font-sans text-base font-bold">
        <Syringe className="size-5 text-brand-600" aria-hidden /> Lembrete de vacina
      </h2>
      <ul className="flex flex-col gap-1">
        {reminders.data.map((reminder) => (
          <li key={reminder.vaccineId}>
            <Link
              to={`/pets/${reminder.petId}/editar`}
              className="flex justify-between gap-3 hover:underline"
            >
              <span>
                <b>{reminder.vaccineName}</b> de {reminder.petName}
              </span>
              <span
                className={`shrink-0 font-semibold ${reminder.daysLeft < 0 ? 'text-red-700 dark:text-red-300' : ''}`}
              >
                {reminder.daysLeft < 0
                  ? `atrasada há ${-reminder.daysLeft} ${-reminder.daysLeft === 1 ? 'dia' : 'dias'}`
                  : reminder.daysLeft === 0
                    ? 'vence hoje'
                    : `em ${reminder.daysLeft} ${reminder.daysLeft === 1 ? 'dia' : 'dias'}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  )
}

/** Mais curtidos da semana, em carrossel. */
function Trending() {
  const trending = useQuery({
    // Chave fora de ['posts']: a curtida otimista só mexe nas listas paginadas
    queryKey: ['trending-posts'],
    queryFn: () => api<Post[]>('/posts/trending'),
    staleTime: 5 * 60_000,
  })
  if (!trending.data?.length) return null

  return (
    <section aria-labelledby="em-alta" className="flex flex-col gap-3">
      <h2 id="em-alta" className="flex items-center gap-2 text-xl font-semibold">
        <Flame className="size-5 text-brand-500" aria-hidden /> Em alta na semana
      </h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {trending.data.map((post, index) => (
          <li key={post.id} className="w-36 shrink-0 snap-start">
            <Link
              to={`/posts/${post.id}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-surface-2"
            >
              <img
                src={post.imageUrl}
                alt={post.caption.slice(0, 80) || `Publicação de ${post.author.name}`}
                loading="lazy"
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-black/55 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-sm font-semibold text-white">
                <Heart className="size-4 fill-white" aria-hidden /> {post.likeCount}
                <span className="ml-auto truncate">
                  {post.pet?.name ?? post.author.name.split(' ')[0]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
