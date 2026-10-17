import { type ReactNode, useId } from 'react'

const control =
  'w-full rounded-2xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700 aria-invalid:border-brand-600'

interface FieldProps {
  label: string
  error?: string | undefined
  hint?: string
  children: (props: {
    id: string
    className: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}

/** Label + controle + mensagem de erro, com ligações de acessibilidade. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children({
        id,
        className: control,
        'aria-invalid': Boolean(error),
        ...(describedBy && { 'aria-describedby': describedBy }),
      })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-brand-700 dark:text-brand-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
