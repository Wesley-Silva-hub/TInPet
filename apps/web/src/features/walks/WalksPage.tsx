import { type Walk, walkStatusLabels } from '@tinpet/shared'
import { Dog } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useWalkAction, useWalks, walkWhen } from './queries'
import { priceText } from './WalkersPage'

const statusStyle: Record<Walk['status'], string> = {
  REQUESTED: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  DECLINED: 'bg-surface-2 text-muted',
  CANCELLED: 'bg-surface-2 text-muted',
  DONE: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
}

function WalkCard({ walk }: { walk: Walk }) {
  const action = useWalkAction()
  const [reply, setReply] = useState('')
  const isWalker = walk.myRole === 'WALKER'
  const other = isWalker ? walk.owner : walk.walker
  const future = new Date(walk.startsAt).getTime() > Date.now()
  const run = (name: 'accept' | 'decline' | 'cancel' | 'done') =>
    action.mutate({ id: walk.id, action: name, note: reply.trim() })

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        {walk.pet.photoUrl ? (
          <img src={walk.pet.photoUrl} alt="" className="size-14 rounded-2xl object-cover" />
        ) : (
          <span
            className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-2xl"
            aria-hidden
          >
            🐾
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {walk.pet.name} · {walk.durationMinutes} min
          </p>
          <p className="text-sm text-muted">{walkWhen(walk.startsAt)}</p>
          <p className="text-sm text-muted">
            {isWalker ? 'Tutor: ' : 'Passeador: '}
            <Link
              to={isWalker ? `/usuarios/${other.id}` : `/passeadores/${other.id}`}
              className="font-semibold text-ink underline"
            >
              {other.name}
            </Link>{' '}
            · {priceText(walk.priceCents)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyle[walk.status]}`}
        >
          {walkStatusLabels[walk.status]}
        </span>
      </div>
      {walk.note && (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          <Avatar src={walk.owner.avatarUrl} name={walk.owner.name} className="size-6" />
          {walk.note}
        </p>
      )}
      {walk.responseNote && (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          <Avatar src={walk.walker.avatarUrl} name={walk.walker.name} className="size-6" />
          {walk.responseNote}
        </p>
      )}

      {isWalker && walk.status === 'REQUESTED' && (
        <div className="flex flex-col gap-2">
          <input
            value={reply}
            maxLength={300}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Resposta para o tutor (opcional)"
            aria-label="Resposta para o tutor"
            className="rounded-2xl border border-line bg-canvas px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button className="flex-1" loading={action.isPending} onClick={() => run('accept')}>
              Aceitar
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              loading={action.isPending}
              onClick={() => run('decline')}
            >
              Recusar
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {isWalker && walk.status === 'ACCEPTED' && !future && (
          <Button variant="secondary" loading={action.isPending} onClick={() => run('done')}>
            Marcar como feito
          </Button>
        )}
        {future && (walk.status === 'REQUESTED' || walk.status === 'ACCEPTED') && (
          <Button
            variant="ghost"
            loading={action.isPending}
            onClick={() => {
              if (window.confirm('Cancelar este passeio? A outra pessoa será avisada.'))
                run('cancel')
            }}
          >
            Cancelar passeio
          </Button>
        )}
      </div>
    </li>
  )
}

export function WalksPage() {
  const walks = useWalks()
  const [tab, setTab] = useState<'OWNER' | 'WALKER'>('OWNER')
  const items = walks.data?.filter((walk) => walk.myRole === tab) ?? []
  const pending =
    walks.data?.filter((walk) => walk.myRole === 'WALKER' && walk.status === 'REQUESTED').length ??
    0
  const tabClass = (value: typeof tab) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      tab === value ? 'bg-ink text-canvas' : 'bg-surface-2 text-muted hover:text-ink'
    }`

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Meus passeios" />
      <div role="tablist" aria-label="Meus passeios" className="flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'OWNER'}
          className={tabClass('OWNER')}
          onClick={() => setTab('OWNER')}
        >
          Que eu pedi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'WALKER'}
          className={tabClass('WALKER')}
          onClick={() => setTab('WALKER')}
        >
          Como passeador{pending > 0 && ` (${pending})`}
        </button>
      </div>
      {walks.isPending ? (
        <LoadingState />
      ) : walks.isError ? (
        <ErrorState error={walks.error} onRetry={() => walks.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Dog className="size-8" />} title="Nenhum passeio por aqui">
          {tab === 'OWNER' ? (
            <Link to="/passeadores" className="font-semibold text-brand-600 underline">
              Encontre um passeador perto de você
            </Link>
          ) : (
            <Link to="/passeadores/meu-perfil" className="font-semibold text-brand-600 underline">
              Crie seu perfil de passeador
            </Link>
          )}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((walk) => (
            <WalkCard key={walk.id} walk={walk} />
          ))}
        </ul>
      )}
    </div>
  )
}
