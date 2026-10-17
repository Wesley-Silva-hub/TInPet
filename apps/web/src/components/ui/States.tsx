import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../lib/api'

export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  )
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-muted">
      <Spinner className="size-8 text-brand-500" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-surface-2">
        {icon}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="max-w-sm text-muted">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <CircleAlert className="size-10 text-brand-600" aria-hidden />
      <p className="text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold text-brand-600 underline">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
