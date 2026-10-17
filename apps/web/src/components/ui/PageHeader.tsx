import type { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {action}
    </header>
  )
}
