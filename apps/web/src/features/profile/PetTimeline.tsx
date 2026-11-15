import { useQuery } from '@tanstack/react-query'
import type { Timeline, TimelineItem, TimelineKind } from '@tinpet/shared'
import { Lock } from 'lucide-react'
import { Link } from 'react-router'
import { LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'

const icons: Record<TimelineKind, string> = {
  BIRTH: '🎂',
  JOINED: '🐾',
  POST: '📸',
  VACCINE: '💉',
  HEALTH: '🩺',
  WEIGHT: '⚖️',
  FIRST_MATCH: '💘',
  FOUND: '🏡',
}

/** Itens que só o tutor vê (marcados com cadeado). */
const privateKinds = new Set<TimelineKind>(['VACCINE', 'HEALTH', 'WEIGHT', 'FIRST_MATCH'])

// Datas sem hora (nascimento, vacina) chegam à meia-noite UTC: exibe no mesmo fuso
const monthTitle = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** Agrupa por mês mantendo a ordem (mais recente primeiro). */
export function groupByMonth(items: TimelineItem[]) {
  const groups: { key: string; title: string; items: TimelineItem[] }[] = []
  for (const item of items) {
    const key = item.date.slice(0, 7)
    const last = groups.at(-1)
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, title: monthTitle.format(new Date(item.date)), items: [item] })
  }
  return groups
}

function Entry({ item }: { item: TimelineItem }) {
  const content = (
    <>
      <span
        className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-canvas bg-surface-2 text-lg"
        aria-hidden
      >
        {icons[item.kind]}
      </span>
      <span className="min-w-0 flex-1 pt-1">
        <span className="flex items-center gap-1.5 font-semibold">
          {item.title}
          {privateKinds.has(item.kind) && (
            <Lock className="size-3.5 text-muted" aria-label="Só você vê" />
          )}
        </span>
        <span className="block text-xs text-muted">{dayFormat.format(new Date(item.date))}</span>
        {item.detail && <span className="mt-0.5 line-clamp-2 block text-sm">{item.detail}</span>}
      </span>
      {item.imageUrl && (
        <img src={item.imageUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      )}
    </>
  )
  return (
    <li>
      {item.to ? (
        <Link to={item.to} className="flex items-start gap-3 rounded-2xl p-2 hover:bg-surface-2">
          {content}
        </Link>
      ) : (
        <div className="flex items-start gap-3 p-2">{content}</div>
      )}
    </li>
  )
}

/** Linha do tempo do pet: marcos e fotos, mês a mês. */
export function PetTimeline({ petId, petName }: { petId: string; petName: string }) {
  const timeline = useQuery({
    queryKey: ['pet', petId, 'timeline'],
    queryFn: () => api<Timeline>(`/pets/${petId}/timeline`),
  })
  if (timeline.isPending) return <LoadingState />
  if (!timeline.data) return null
  const groups = groupByMonth(timeline.data.items)

  return (
    <section aria-labelledby="linha-do-tempo" className="flex flex-col gap-3">
      <div>
        <h2 id="linha-do-tempo" className="text-lg font-semibold">
          Linha do tempo
        </h2>
        {timeline.data.isMine && (
          <p className="text-sm text-muted">
            Os itens com cadeado (saúde e matches) só você vê. Os outros veem as fotos e os marcos
            de {petName}.
          </p>
        )}
      </div>
      <div className="relative">
        {/* Trilho vertical atrás dos ícones */}
        <span className="absolute top-2 bottom-2 left-[1.75rem] w-0.5 bg-line" aria-hidden />
        {groups.map((group) => (
          <div key={group.key} className="mb-2">
            <h3 className="relative z-10 mb-1 ml-14 text-sm font-bold text-brand-700 capitalize dark:text-brand-400">
              {group.title}
            </h3>
            <ol className="flex flex-col">
              {group.items.map((item) => (
                <Entry key={item.id} item={item} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
