import { PawPrint } from 'lucide-react'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-2xl font-semibold ${className}`}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-white">
        <PawPrint className="size-5" aria-hidden />
      </span>
      Tin<span className="-ml-2 text-brand-500">Pet</span>
    </span>
  )
}
