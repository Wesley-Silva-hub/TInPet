import { Hash } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { PostCard } from './PostCard'
import { usePosts } from './queries'

/** Publicações com uma hashtag, das mais recentes para as mais antigas. */
export function TagPage() {
  const tag = decodeURIComponent((useParams() as { tag: string }).tag).toLocaleLowerCase('pt-BR')
  const posts = usePosts({ tag })
  const items = posts.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={`#${tag}`} />
      {posts.isSuccess && items.length > 0 && (
        <p className="-mt-4 text-muted">
          {items.length}
          {posts.hasNextPage ? '+' : ''} {items.length === 1 ? 'publicação' : 'publicações'}
        </p>
      )}
      {posts.isPending && <LoadingState />}
      {posts.isError && <ErrorState error={posts.error} onRetry={() => posts.refetch()} />}
      {posts.isSuccess && items.length === 0 && (
        <EmptyState icon={<Hash className="size-8" />} title="Nada com essa hashtag ainda">
          <Link to="/publicar" className="font-semibold text-brand-600 underline">
            Seja o primeiro a usar #{tag}
          </Link>
        </EmptyState>
      )}
      <div className="flex flex-col gap-6">
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <InfiniteSentinel
        hasMore={Boolean(posts.hasNextPage)}
        loading={posts.isFetchingNextPage}
        onLoadMore={() => posts.fetchNextPage()}
      />
    </div>
  )
}
