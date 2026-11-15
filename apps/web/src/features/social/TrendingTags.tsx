import { useQuery } from '@tanstack/react-query'
import type { TrendingHashtag } from '@tinpet/shared'
import { TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { api } from '../../lib/api'

/** Hashtags mais usadas nas últimas duas semanas (some quando não há nenhuma). */
export function TrendingTags() {
  const tags = useQuery({
    queryKey: ['hashtags', 'trending'],
    queryFn: () => api<TrendingHashtag[]>('/hashtags/trending'),
    staleTime: 5 * 60_000,
  })
  if (!tags.data?.length) return null
  return (
    <section aria-labelledby="tags-em-alta" className="flex flex-col gap-2">
      <h2 id="tags-em-alta" className="flex items-center gap-2 text-lg font-semibold">
        <TrendingUp className="size-5 text-brand-500" aria-hidden /> Tags em alta
      </h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tags.data.map(({ tag, count }) => (
          <li key={tag} className="shrink-0">
            <Link
              to={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              #{tag}
              <span className="text-xs font-normal text-muted">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
