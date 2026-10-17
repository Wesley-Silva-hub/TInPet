import { useEffect, useRef } from 'react'
import { Spinner } from './States'

interface InfiniteSentinelProps {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

/** Carrega a próxima página quando o fim da lista aparece na tela. */
export function InfiniteSentinel({ hasMore, loading, onLoadMore }: InfiniteSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loading) onLoadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  if (!hasMore) return null
  return (
    <div ref={ref} className="flex justify-center py-6 text-brand-500">
      {loading && <Spinner />}
    </div>
  )
}
