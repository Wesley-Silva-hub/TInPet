/** Marca do TinPet: a plaquinha de coleira (argola + placa redonda) com um focinho gravado. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden>
      <circle cx="20" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="20" cy="27" r="16" className="fill-brand-500" />
      <circle cx="20" cy="27" r="12.5" fill="none" className="stroke-brand-200" strokeWidth="1.2" />
      {/* Focinho de cachorro: largo em cima, arredondado embaixo */}
      <path
        d="M11.5 24.2c0-2.2 1.9-3.6 4.4-3.6h8.2c2.5 0 4.4 1.4 4.4 3.6 0 3.6-4.4 7-8.5 7s-8.5-3.4-8.5-7z"
        className="fill-canvas"
      />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-2xl font-extrabold tracking-tight ${className}`}
    >
      <LogoMark className="size-9 text-ink" />
      tinpet
    </span>
  )
}
