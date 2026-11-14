import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type StoreReviews, storeReviewInputSchema } from '@tinpet/shared'
import { Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { timeAgo } from '../../lib/time'

const ratingLabels = ['', 'Péssima', 'Ruim', 'Ok', 'Boa', 'Excelente']

export function Stars({ value, className = 'size-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={`${className} ${star <= value ? 'fill-sun-400 text-sun-400' : 'text-line'}`}
        />
      ))}
    </span>
  )
}

/** Escolha de 1 a 5 estrelas acessível por teclado (grupo de rádios). */
function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-semibold">Sua nota</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer rounded-full p-1 focus-within:ring-2">
            <input
              type="radio"
              name="nota"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <Star
              aria-hidden
              className={`size-8 transition ${
                star <= value ? 'fill-sun-400 text-sun-400' : 'text-line hover:text-sun-400'
              }`}
            />
            <span className="sr-only">
              {star} {star === 1 ? 'estrela' : 'estrelas'} ({ratingLabels[star]})
            </span>
          </label>
        ))}
        {value > 0 && <span className="ml-2 text-sm text-muted">{ratingLabels[value]}</span>}
      </div>
    </fieldset>
  )
}

/** Avaliações da loja: média, a minha (editável) e as dos outros tutores. */
export function StoreReviewsSection({ storeId }: { storeId: string }) {
  const me = useMe()
  const queryClient = useQueryClient()
  const key = ['stores', storeId, 'reviews']
  const reviews = useQuery({
    queryKey: key,
    queryFn: () => api<StoreReviews>(`/stores/${storeId}/reviews`),
  })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const mine = reviews.data?.mine
  useEffect(() => {
    if (mine) {
      setRating(mine.rating)
      setComment(mine.comment)
    }
  }, [mine])

  const onSaved = (data: StoreReviews) => {
    queryClient.setQueryData(key, data)
    queryClient.invalidateQueries({ queryKey: ['stores'] })
  }
  const save = useMutation({
    mutationFn: () => {
      const parsed = storeReviewInputSchema.safeParse({ rating, comment })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira a nota')
      return api<StoreReviews>(`/stores/${storeId}/reviews/mine`, {
        method: 'PUT',
        body: parsed.data,
      })
    },
    onSuccess: (data) => {
      onSaved(data)
      toast.success('Obrigado pela avaliação!')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: () => api<StoreReviews>(`/stores/${storeId}/reviews/mine`, { method: 'DELETE' }),
    onSuccess: (data) => {
      onSaved(data)
      setRating(0)
      setComment('')
      toast.success('Avaliação removida')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (reviews.isPending) return <LoadingState />
  if (reviews.isError) return <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
  const { summary, items } = reviews.data
  const others = items.filter((item) => !item.isMine)

  return (
    <section aria-labelledby="avaliacoes-loja" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="avaliacoes-loja" className="text-xl font-semibold">
          Avaliações
        </h2>
        {summary.average !== null ? (
          <p className="flex items-center gap-2">
            <span className="font-display text-3xl font-semibold">
              {summary.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
            </span>
            <Stars value={Math.round(summary.average)} />
            <span className="text-sm text-muted">
              {summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">Ainda sem avaliações. Seja o primeiro!</p>
        )}
      </div>

      {me.role === 'OWNER' && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
        >
          <StarPicker value={rating} onChange={setRating} />
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Comentário (opcional)</span>
            <textarea
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Como foi o atendimento, a entrega, os produtos…"
              className="rounded-2xl border border-line bg-canvas px-4 py-3 focus:border-brand-400 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={save.isPending} disabled={rating === 0}>
              {mine ? 'Atualizar avaliação' : 'Publicar avaliação'}
            </Button>
            {mine && (
              <Button
                type="button"
                variant="ghost"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
              >
                <Trash2 className="size-4" aria-hidden /> Apagar
              </Button>
            )}
          </div>
        </form>
      )}

      {others.length > 0 && (
        <ul className="flex flex-col gap-3">
          {others.map((review) => (
            <li key={review.id} className="flex gap-3 rounded-card bg-surface p-4">
              <Avatar src={review.author.avatarUrl} name={review.author.name} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{review.author.name}</span>
                  <Stars value={review.rating} className="size-3.5" />
                  <time dateTime={review.updatedAt} className="text-xs text-muted">
                    {timeAgo(review.updatedAt)}
                  </time>
                </p>
                {review.comment && <p className="mt-1 whitespace-pre-line">{review.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
