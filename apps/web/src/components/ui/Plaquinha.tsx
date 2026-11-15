import type { ReactNode } from 'react'

const tones = {
  sun: 'bg-sun-400 text-ink',
  brand: 'bg-brand-500 text-white',
  river: 'bg-river-500 text-white',
  plain: 'bg-surface-2 text-ink',
} as const

/**
 * Selo no formato da plaquinha de coleira (com o furinho da argola): a assinatura visual do
 * TinPet. Use para status que importam (vacinas em dia, seu alerta, 1º do ranking), não em tudo.
 */
export function Plaquinha({
  children,
  tone = 'sun',
  className = '',
}: {
  children: ReactNode
  tone?: keyof typeof tones
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-xs font-bold ${tones[tone]} ${className}`}
    >
      <span
        className="size-2.5 shrink-0 rounded-full bg-canvas/90 ring-1 ring-black/15"
        aria-hidden
      />
      {children}
    </span>
  )
}
