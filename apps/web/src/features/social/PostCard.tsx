import { type Post, speciesLabels } from '@tinpet/shared'
import { Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { timeAgo } from '../../lib/time'
import { CommentsSheet } from './CommentsSheet'
import { useDeletePost, useToggleLike } from './queries'

const CAPTION_PREVIEW = 140

export function PostCard({ post, priority = false }: { post: Post; priority?: boolean }) {
  const toggleLike = useToggleLike()
  const deletePost = useDeletePost()
  const reduceMotion = useReducedMotion()
  const [burst, setBurst] = useState(0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const lastTap = useRef(0)

  const like = () => {
    if (!post.likedByMe) toggleLike.mutate(post)
    setBurst((value) => value + 1)
  }

  // Duplo toque na foto curte (nunca descurte), como no Instagram
  const onImageTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) like()
    lastTap.current = now
  }

  const share = async () => {
    const url = `${window.location.origin}/posts/${post.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'TinPet', text: post.caption, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copiado')
      }
    } catch {
      // Compartilhamento cancelado pelo usuário
    }
  }

  const longCaption = post.caption.length > CAPTION_PREVIEW
  const caption =
    longCaption && !expanded ? `${post.caption.slice(0, CAPTION_PREVIEW).trimEnd()}…` : post.caption

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="overflow-hidden rounded-card border border-line bg-surface shadow-sm"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <Link
          to={`/usuarios/${post.author.id}`}
          className="shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-sun-400 via-brand-500 to-brand-700"
        >
          <span className="block rounded-full bg-surface p-0.5">
            <Avatar src={post.author.avatarUrl} name={post.author.name} className="size-10" />
          </span>
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            to={post.mine ? '/perfil' : `/usuarios/${post.author.id}`}
            className="font-semibold hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="truncate text-sm text-muted">
            {post.pet && (
              <>
                com{' '}
                <Link
                  to={`/pets/${post.pet.id}`}
                  className="font-semibold text-ink hover:underline"
                >
                  {post.pet.name}
                </Link>{' '}
                · {speciesLabels[post.pet.species]}
              </>
            )}
            {post.pet && post.author.city && ' · '}
            {post.author.city}
          </p>
        </div>
        {post.mine && (
          <details className="relative">
            <summary
              className="list-none rounded-full p-2 hover:bg-surface-2"
              aria-label="Opções do post"
            >
              <MoreHorizontal className="size-5" aria-hidden />
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-2xl border border-line bg-surface p-1 shadow-lg">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-brand-700 hover:bg-surface-2"
                onClick={() => {
                  if (window.confirm('Apagar este post?')) deletePost.mutate(post.id)
                }}
              >
                Apagar post
              </button>
            </div>
          </details>
        )}
      </header>

      <button
        type="button"
        onClick={onImageTap}
        aria-label={`Foto de ${post.author.name}. Toque duas vezes para curtir`}
        className="relative block aspect-[4/5] w-full select-none overflow-hidden bg-surface-2"
      >
        <img
          src={post.imageUrl}
          alt={post.caption ? post.caption.slice(0, 120) : `Foto publicada por ${post.author.name}`}
          loading={priority ? 'eager' : 'lazy'}
          draggable={false}
          className="size-full object-cover"
        />
        <AnimatePresence>
          {burst > 0 && !reduceMotion && (
            <motion.span
              key={burst}
              aria-hidden
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.45 }}
              onAnimationComplete={() => setBurst(0)}
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <Heart className="size-28 fill-white text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)]" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
        <div className="-ml-2 flex items-center gap-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            onClick={() => toggleLike.mutate(post)}
            aria-pressed={post.likedByMe}
            aria-label={post.likedByMe ? 'Descurtir' : 'Curtir'}
            className="rounded-full p-2 hover:bg-surface-2"
          >
            <motion.span
              key={String(post.likedByMe)}
              initial={reduceMotion ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              className="block"
            >
              <Heart
                className={`size-7 ${post.likedByMe ? 'fill-brand-500 text-brand-500' : 'text-ink'}`}
                aria-hidden
              />
            </motion.span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => setCommentsOpen(true)}
            aria-label="Comentar"
            className="rounded-full p-2 hover:bg-surface-2"
          >
            <MessageCircle className="size-7" aria-hidden />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={share}
            aria-label="Compartilhar"
            className="rounded-full p-2 hover:bg-surface-2"
          >
            <Send className="size-7" aria-hidden />
          </motion.button>
        </div>

        <p className="font-semibold" aria-live="polite">
          {post.likeCount === 1
            ? '1 curtida'
            : `${post.likeCount.toLocaleString('pt-BR')} curtidas`}
        </p>

        {post.caption && (
          <p className="whitespace-pre-line break-words">
            <Link to={`/usuarios/${post.author.id}`} className="mr-1.5 font-semibold">
              {post.author.name.split(' ')[0]}
            </Link>
            {caption}
            {longCaption && !expanded && (
              <button type="button" onClick={() => setExpanded(true)} className="ml-1 text-muted">
                mais
              </button>
            )}
          </p>
        )}

        {post.commentCount > post.recentComments.length && (
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="self-start text-muted"
          >
            Ver todos os {post.commentCount} comentários
          </button>
        )}
        {post.recentComments.map((comment) => (
          <p key={comment.id} className="break-words">
            <span className="mr-1.5 font-semibold">{comment.author.name.split(' ')[0]}</span>
            {comment.content}
          </p>
        ))}
        <time dateTime={post.createdAt} className="text-xs tracking-wide text-muted uppercase">
          {timeAgo(post.createdAt)}
        </time>
      </div>

      <CommentsSheet post={post} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </motion.article>
  )
}
