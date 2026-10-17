import { MAX_COMMENT_LENGTH, type Post } from '@tinpet/shared'
import { SendHorizontal, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingState, Spinner } from '../../components/ui/States'
import { timeAgo } from '../../lib/time'
import { useAddComment, useComments, useDeleteComment } from './queries'

interface CommentsSheetProps {
  post: Post
  open: boolean
  onClose: () => void
}

/** Gaveta de comentários: sobe de baixo no celular, vira janela centralizada no desktop. */
export function CommentsSheet({ post, open, onClose }: CommentsSheetProps) {
  const comments = useComments(post.id, open)
  const add = useAddComment(post)
  const remove = useDeleteComment(post)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const list = (comments.data?.pages ?? []).flatMap((page) => page.items)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    input.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    add.mutate(content, { onSuccess: () => setDraft('') })
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`comentarios-${post.id}`}
            className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-surface sm:rounded-[2rem]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="relative flex items-center justify-center border-b border-line py-4">
              <span
                className="absolute top-2 h-1.5 w-12 rounded-full bg-line sm:hidden"
                aria-hidden
              />
              <h2 id={`comentarios-${post.id}`} className="text-lg font-semibold">
                Comentários
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="absolute right-3 rounded-full p-2 hover:bg-surface-2"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {comments.isPending && <LoadingState />}
              {comments.isSuccess && list.length === 0 && (
                <p className="py-10 text-center text-muted">Seja o primeiro a comentar 💬</p>
              )}
              <ul className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {list.map((comment) => (
                    <motion.li
                      key={comment.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      className="flex gap-3"
                    >
                      <Link to={`/usuarios/${comment.author.id}`} onClick={onClose}>
                        <Avatar
                          src={comment.author.avatarUrl}
                          name={comment.author.name}
                          className="size-9"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="break-words">
                          <span className="mr-1.5 font-semibold">{comment.author.name}</span>
                          {comment.content}
                        </p>
                        <time dateTime={comment.createdAt} className="text-xs text-muted">
                          {timeAgo(comment.createdAt)}
                        </time>
                      </div>
                      {(comment.mine || post.mine) && (
                        <button
                          type="button"
                          onClick={() => remove.mutate(comment.id)}
                          aria-label="Apagar comentário"
                          className="self-start rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-brand-700"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              {comments.hasNextPage && (
                <button
                  type="button"
                  onClick={() => comments.fetchNextPage()}
                  className="mx-auto mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600"
                >
                  {comments.isFetchingNextPage && <Spinner className="size-4" />}
                  Ver mais comentários
                </button>
              )}
            </div>

            <form
              onSubmit={submit}
              className="flex items-end gap-2 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <label htmlFor={`novo-comentario-${post.id}`} className="sr-only">
                Escreva um comentário
              </label>
              <textarea
                id={`novo-comentario-${post.id}`}
                ref={input}
                rows={1}
                value={draft}
                maxLength={MAX_COMMENT_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder="Adicione um comentário…"
                className="max-h-28 flex-1 resize-none rounded-3xl border border-line bg-canvas px-4 py-3 focus:border-brand-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || add.isPending}
                aria-label="Publicar comentário"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-50"
              >
                {add.isPending ? (
                  <Spinner className="size-5" />
                ) : (
                  <SendHorizontal className="size-5" aria-hidden />
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
