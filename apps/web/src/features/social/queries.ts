import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type { Comment, LikeResult, Page, Post } from '@tinpet/shared'
import { toast } from 'sonner'
import { api, errorMessage } from '../../lib/api'

export const postsKey = (authorId?: string) => ['posts', authorId ?? 'all'] as const
export const commentsKey = (postId: string) => ['comments', postId] as const

type Feed = InfiniteData<Page<Post>>

export function usePosts(authorId?: string) {
  return useInfiniteQuery({
    queryKey: postsKey(authorId),
    queryFn: ({ pageParam }) =>
      api<Page<Post>>('/posts', { query: { authorId, cursor: pageParam, limit: 8 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

/** Aplica uma mudança no post em todas as listas em cache (feed geral e perfis). */
function updatePostEverywhere(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  change: (post: Post) => Post,
) {
  queryClient.setQueriesData<Feed>({ queryKey: ['posts'] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((post) => (post.id === postId ? change(post) : post)),
          })),
        }
      : data,
  )
  queryClient.setQueryData<Post>(['post', postId], (post) => (post ? change(post) : post))
}

/** Curtida otimista: a interface responde na hora e desfaz se a API falhar. */
export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: Post) =>
      api<LikeResult>(`/posts/${post.id}/like`, { method: post.likedByMe ? 'DELETE' : 'PUT' }),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        likedByMe: !post.likedByMe,
        likeCount: current.likeCount + (post.likedByMe ? -1 : 1),
      }))
    },
    onSuccess: (result, post) =>
      updatePostEverywhere(queryClient, post.id, (current) => ({ ...current, ...result })),
    onError: (error, post) => {
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        likedByMe: post.likedByMe,
        likeCount: post.likeCount,
      }))
      toast.error(errorMessage(error))
    },
  })
}

export function useComments(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentsKey(postId),
    queryFn: ({ pageParam }) =>
      api<Page<Comment>>(`/posts/${postId}/comments`, { query: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  })
}

export function useAddComment(post: Post) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api<Comment>(`/posts/${post.id}/comments`, { method: 'POST', body: { content } }),
    onSuccess: (comment) => {
      queryClient.setQueryData<InfiniteData<Page<Comment>>>(commentsKey(post.id), (data) => {
        if (!data) return data
        const pages = [...data.pages]
        const last = pages.at(-1)
        if (last) pages[pages.length - 1] = { ...last, items: [...last.items, comment] }
        return { ...data, pages }
      })
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        commentCount: current.commentCount + 1,
        recentComments: [...current.recentComments, comment].slice(-2),
      }))
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useDeleteComment(post: Post) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => api(`/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<InfiniteData<Page<Comment>>>(commentsKey(post.id), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter((comment) => comment.id !== commentId),
              })),
            }
          : data,
      )
      updatePostEverywhere(queryClient, post.id, (current) => ({
        ...current,
        commentCount: Math.max(0, current.commentCount - 1),
        recentComments: current.recentComments.filter((comment) => comment.id !== commentId),
      }))
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => api(`/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post apagado')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
