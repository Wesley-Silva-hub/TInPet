import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ModerationReport,
  type Page,
  reportReasonLabels,
  type reportStatuses,
} from '@tinpet/shared'
import { Ban, CheckCheck, RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { timeAgo } from '../../lib/time'

type Status = (typeof reportStatuses)[number]

const reportsKey = ['moderation', 'reports'] as const

function useReports(status: Status) {
  return useInfiniteQuery({
    queryKey: [...reportsKey, status],
    queryFn: ({ pageParam }) =>
      api<Page<ModerationReport>>('/admin/reports', { query: { status, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

function useModerationAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method }: { path: string; method: 'POST' | 'DELETE'; done: string }) =>
      api(path, { method }),
    onSuccess: (_data, { done }) => {
      toast.success(done)
      queryClient.invalidateQueries({ queryKey: reportsKey })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

function ReportCard({ report }: { report: ModerationReport }) {
  const action = useModerationAction()
  const { reported } = report

  const suspend = () => {
    if (
      !window.confirm(`Suspender a conta de ${reported.name}? A pessoa sai de todos os aparelhos.`)
    )
      return
    action.mutate({
      path: `/admin/users/${reported.id}/suspend`,
      method: 'POST',
      done: 'Conta suspensa e denúncias encerradas',
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar src={reported.avatarUrl} name={reported.name} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {reported.name}
            {reported.suspended && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                suspensa
              </span>
            )}
          </p>
          <p className="text-sm text-muted">
            {reported.openReports > 1
              ? `${reported.openReports} denúncias abertas`
              : `${reported.openReports} denúncia aberta`}
          </p>
        </div>
        <time dateTime={report.createdAt} className="shrink-0 text-xs text-muted">
          {timeAgo(report.createdAt)}
        </time>
      </div>
      <div className="rounded-2xl bg-surface-2 p-3 text-sm">
        <p className="font-semibold">{reportReasonLabels[report.reason]}</p>
        {report.details && <p className="mt-1 whitespace-pre-line text-muted">{report.details}</p>}
        <p className="mt-2 text-xs text-muted">
          Denunciado por {report.reporter?.name ?? 'conta excluída'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!report.resolvedAt && (
          <Button
            variant="secondary"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({
                path: `/admin/reports/${report.id}/resolve`,
                method: 'POST',
                done: 'Denúncia marcada como resolvida',
              })
            }
          >
            <CheckCheck className="size-4" aria-hidden /> Resolver sem punição
          </Button>
        )}
        {reported.suspended ? (
          <Button
            variant="secondary"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({
                path: `/admin/users/${reported.id}/suspend`,
                method: 'DELETE',
                done: 'Conta reativada',
              })
            }
          >
            <RotateCcw className="size-4" aria-hidden /> Reativar conta
          </Button>
        ) : (
          <Button variant="danger" disabled={action.isPending} onClick={suspend}>
            <Ban className="size-4" aria-hidden /> Suspender conta
          </Button>
        )}
      </div>
    </li>
  )
}

/** Painel de moderação (só ADMIN): denúncias abertas, resolvidas e suspensão de contas. */
export function ModerationPage() {
  const [status, setStatus] = useState<Status>('open')
  const reports = useReports(status)
  const items = reports.data?.pages.flatMap((page) => page.items) ?? []
  const tabClass = (value: Status) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      status === value ? 'bg-ink text-canvas' : 'bg-surface-2 text-muted hover:text-ink'
    }`

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Moderação" />
      <div role="tablist" aria-label="Situação das denúncias" className="flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={status === 'open'}
          className={tabClass('open')}
          onClick={() => setStatus('open')}
        >
          Abertas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={status === 'resolved'}
          className={tabClass('resolved')}
          onClick={() => setStatus('resolved')}
        >
          Resolvidas
        </button>
      </div>
      {reports.isPending && <LoadingState />}
      {reports.isError && <ErrorState error={reports.error} onRetry={() => reports.refetch()} />}
      {reports.isSuccess && items.length === 0 && (
        <EmptyState icon={<ShieldCheck className="size-8" />} title="Nenhuma denúncia aqui">
          {status === 'open'
            ? 'Tudo tranquilo na comunidade por enquanto.'
            : 'As denúncias resolvidas aparecem aqui.'}
        </EmptyState>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </ul>
      <InfiniteSentinel
        hasMore={Boolean(reports.hasNextPage)}
        loading={reports.isFetchingNextPage}
        onLoadMore={() => reports.fetchNextPage()}
      />
    </div>
  )
}
