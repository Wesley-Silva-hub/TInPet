import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './States'

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/30',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-brand-700 text-white hover:bg-brand-600',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
