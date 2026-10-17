import { Camera, Heart, MessageCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { Skeleton } from '../../components/ui/Skeleton'
import { usePosts } from './queries'

/** Grade de fotos do perfil, com curtidas e comentários ao passar o mouse. */
export function PostGrid({ authorId, emptyText }: { authorId: string; emptyText: string }) {
  const posts = usePosts(authorId)
  const reduceMotion = useReducedMotion()
  const items = posts.data?.pages.flatMap((page) => page.items) ?? []

  if (posts.isPending) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {['a', 'b', 'c'].map((key) => (
          <Skeleton key={key} className="aspect-square rounded-md" />
        ))}
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <p className="flex flex-col items-center gap-2 py-10 text-center text-muted">
        <Camera className="size-8" aria-hidden />
        {emptyText}
      </p>
    )
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {items.map((post, index) => (
          <motion.li
            key={post.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index, 9) * 0.03 }}
          >
            <Link
              to={`/posts/${post.id}`}
              className="group relative block aspect-square overflow-hidden rounded-md bg-surface-2"
            >
              <img
                src={post.imageUrl}
                alt={post.caption.slice(0, 80) || 'Publicação'}
                loading="lazy"
                className="size-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center gap-4 bg-black/45 font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-5 fill-white" aria-hidden /> {post.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-5 fill-white" aria-hidden /> {post.commentCount}
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
      <InfiniteSentinel
        hasMore={Boolean(posts.hasNextPage)}
        loading={posts.isFetchingNextPage}
        onLoadMore={() => posts.fetchNextPage()}
      />
    </>
  )
}
