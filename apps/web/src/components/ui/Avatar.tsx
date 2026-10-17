interface AvatarProps {
  src: string | null | undefined
  name: string
  className?: string
}

export function Avatar({ src, name, className = 'size-12' }: AvatarProps) {
  if (src) {
    return <img src={src} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center rounded-full bg-brand-100 font-display font-semibold text-brand-700`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
