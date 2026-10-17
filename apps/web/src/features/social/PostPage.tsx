import { useQuery } from '@tanstack/react-query'
import type { Post } from '@tinpet/shared'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { PostSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { PostCard } from './PostCard'

export function PostPage() {
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const post = useQuery({ queryKey: ['post', id], queryFn: () => api<Post>(`/posts/${id}`) })

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Voltar
      </button>
      {post.isPending && <PostSkeleton />}
      {post.isError && <ErrorState error={post.error} onRetry={() => post.refetch()} />}
      {post.data && <PostCard post={post.data} priority />}
    </div>
  )
}
