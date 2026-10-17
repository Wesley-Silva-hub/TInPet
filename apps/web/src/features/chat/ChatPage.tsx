import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MAX_MESSAGE_LENGTH, type Message, type Page } from '@tinpet/shared'
import { ArrowLeft, CheckCheck, EllipsisVertical, SendHorizontal } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { connectSocket } from '../../lib/socket'
import { matchesKey, messagesKey } from '../../routes/useRealtime'
import { shortTime, useMatches } from '../matches/MatchesPage'

export function ChatPage() {
  const { id } = useParams() as { id: string }
  const matches = useMatches()
  if (matches.isPending) return <LoadingState />
  if (matches.isError) return <ErrorState error={matches.error} onRetry={() => matches.refetch()} />
  const match = matches.data.find((item) => item.id === id)
  if (!match) {
    return (
      <EmptyState icon={<ArrowLeft className="size-8" />} title="Conversa indisponível">
        <Link to="/matches" className="font-semibold text-brand-600 underline">
          Voltar para os matches
        </Link>
      </EmptyState>
    )
  }
  return (
    <Conversation
      matchId={id}
      title={match.otherPet.name}
      owner={match.otherOwner}
      photo={match.otherPet.photos[0]?.url}
    />
  )
}

interface ConversationProps {
  matchId: string
  title: string
  owner: { id: string; name: string }
  photo: string | undefined
}

function Conversation({ matchId, title, owner, photo }: ConversationProps) {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  const messages = useInfiniteQuery({
    queryKey: messagesKey(matchId),
    queryFn: ({ pageParam }) =>
      api<Page<Message>>(`/matches/${matchId}/messages`, { query: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  // A API devolve do mais recente para o mais antigo; a tela mostra em ordem cronológica
  const list = (messages.data?.pages.flatMap((page) => page.items) ?? []).toReversed()
  const newestId = list.at(-1)?.id

  useEffect(() => {
    if (!newestId) return
    bottom.current?.scrollIntoView({ block: 'end' })
    connectSocket().emit('message:read', { matchId })
    queryClient.invalidateQueries({ queryKey: matchesKey })
  }, [newestId, matchId, queryClient])

  const unmatch = useMutation({
    mutationFn: () => api(`/matches/${matchId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchesKey })
      toast.success('Match desfeito')
      navigate('/matches', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const result = await connectSocket()
        .timeout(8000)
        .emitWithAck('message:send', { matchId, content })
        .catch(async () => {
          // Socket sem resposta (rede instável): envia pelo HTTP
          await api(`/matches/${matchId}/messages`, { method: 'POST', body: { content } })
          queryClient.invalidateQueries({ queryKey: messagesKey(matchId) })
          return { ok: true as const }
        })
      if (result.ok) setDraft('')
      else toast.error(result.error)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col sm:h-[calc(100dvh-7rem)]">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link to="/matches" aria-label="Voltar" className="rounded-full p-2 hover:bg-surface-2">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar src={photo} name={title} className="size-11" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          <Link to={`/usuarios/${owner.id}`} className="text-sm text-muted underline">
            Tutor(a): {owner.name}
          </Link>
        </div>
        <details className="relative">
          <summary
            className="list-none rounded-full p-2 hover:bg-surface-2"
            aria-label="Mais opções"
          >
            <EllipsisVertical className="size-5" aria-hidden />
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-2xl border border-line bg-surface p-1 shadow-lg">
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2"
              onClick={() => {
                if (window.confirm('Desfazer o match? A conversa será encerrada.')) unmatch.mutate()
              }}
            >
              Desfazer match
            </button>
            <Link
              to={`/usuarios/${owner.id}`}
              className="block rounded-xl px-3 py-2 hover:bg-surface-2"
            >
              Bloquear ou denunciar
            </Link>
          </div>
        </details>
      </header>

      <div className="flex-1 overflow-y-auto py-4" aria-live="polite">
        {messages.isPending && <LoadingState />}
        {messages.isError && (
          <ErrorState error={messages.error} onRetry={() => messages.refetch()} />
        )}
        {messages.hasNextPage && (
          <button
            type="button"
            onClick={() => messages.fetchNextPage()}
            className="mx-auto mb-3 flex items-center gap-2 text-sm font-semibold text-brand-600"
          >
            {messages.isFetchingNextPage && <Spinner className="size-4" />}
            Mensagens anteriores
          </button>
        )}
        {messages.isSuccess && list.length === 0 && (
          <p className="py-10 text-center text-muted">Diga oi! Comece falando sobre os pets 🐶🐱</p>
        )}
        <ol className="flex flex-col gap-2">
          {list.map((message) => {
            const mine = message.senderId === me.id
            return (
              <li key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-2 ${
                    mine ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-surface'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-0.5 flex items-center justify-end gap-1 text-xs ${mine ? 'text-white/80' : 'text-muted'}`}
                  >
                    <time dateTime={message.createdAt}>{shortTime(message.createdAt)}</time>
                    {mine && message.readAt && (
                      <CheckCheck className="size-3.5" aria-label="lida" />
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line pt-3">
        <label htmlFor="mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="Escreva uma mensagem…"
          className="max-h-32 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Enviar"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-500 text-white disabled:opacity-50"
        >
          {sending ? (
            <Spinner className="size-5" />
          ) : (
            <SendHorizontal className="size-5" aria-hidden />
          )}
        </button>
      </form>
    </div>
  )
}
