import { useQuery } from '@tanstack/react-query'
import type { MatchSummary } from '@tinpet/shared'
import { MessageCircleHeart } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { matchesKey } from '../../routes/useRealtime'

export function useMatches() {
  return useQuery({ queryKey: matchesKey, queryFn: () => api<MatchSummary[]>('/matches') })
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

export function shortTime(iso: string) {
  const date = new Date(iso)
  const today = new Date().toDateString() === date.toDateString()
  return today ? timeFormat.format(date) : dayFormat.format(date)
}

export function MatchesPage() {
  const matches = useMatches()
  if (matches.isPending) return <LoadingState />
  if (matches.isError) return <ErrorState error={matches.error} onRetry={() => matches.refetch()} />

  if (matches.data.length === 0) {
    return (
      <EmptyState icon={<MessageCircleHeart className="size-8" />} title="Nenhum match ainda">
        <p>Quando alguém curtir seu pet de volta, a conversa aparece aqui.</p>
        <Link to="/feed" className="mt-4 inline-block font-semibold text-brand-600 underline">
          Ir para o feed
        </Link>
      </EmptyState>
    )
  }

  const fresh = matches.data.filter((match) => !match.lastMessage)
  const conversations = matches.data.filter((match) => match.lastMessage)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Matches" />
      {fresh.length > 0 && (
        <section aria-labelledby="novos">
          <h2 id="novos" className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
            Novos matches
          </h2>
          <ul className="flex gap-4 overflow-x-auto pb-2">
            {fresh.map((match) => (
              <li key={match.id} className="shrink-0">
                <Link
                  to={`/matches/${match.id}`}
                  className="flex w-20 flex-col items-center gap-1 text-center text-sm"
                >
                  <Avatar
                    src={match.otherPet.photos[0]?.url}
                    name={match.otherPet.name}
                    className="size-20 ring-2 ring-brand-400 ring-offset-2 ring-offset-canvas"
                  />
                  <span className="font-semibold">{match.otherPet.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {conversations.length > 0 && (
        <section aria-labelledby="conversas">
          <h2
            id="conversas"
            className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase"
          >
            Conversas
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {conversations.map((match) => (
              <li key={match.id}>
                <Link
                  to={`/matches/${match.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-surface-2"
                >
                  <Avatar
                    src={match.otherPet.photos[0]?.url}
                    name={match.otherPet.name}
                    className="size-14"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold">
                        {match.otherPet.name}{' '}
                        <span className="font-normal text-muted">
                          · {match.otherOwner.name.split(' ')[0]}
                        </span>
                      </p>
                      {match.lastMessage && (
                        <time
                          className="shrink-0 text-xs text-muted"
                          dateTime={match.lastMessage.createdAt}
                        >
                          {shortTime(match.lastMessage.createdAt)}
                        </time>
                      )}
                    </div>
                    <p
                      className={`truncate text-sm ${match.unreadCount ? 'font-semibold text-ink' : 'text-muted'}`}
                    >
                      {match.lastMessage?.mine && 'Você: '}
                      {match.lastMessage?.content}
                    </p>
                  </div>
                  {match.unreadCount > 0 && (
                    <span className="grid min-w-6 place-items-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                      <span className="sr-only">mensagens não lidas: </span>
                      {match.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
