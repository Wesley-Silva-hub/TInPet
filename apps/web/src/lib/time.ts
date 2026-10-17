const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto', style: 'short' })
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ['minute', 60],
  ['hour', 60 * 60],
  ['day', 24 * 60 * 60],
]

/** "agora", "há 5 min", "há 3 h", "ontem", e depois a data. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  if (Math.abs(seconds) < 60) return 'agora'
  if (Math.abs(seconds) < 7 * 24 * 60 * 60) {
    const [unit, size] =
      [...steps].reverse().find(([, size]) => Math.abs(seconds) >= size) ??
      (steps[0] as [Intl.RelativeTimeFormatUnit, number])
    return relative.format(Math.round(seconds / size), unit)
  }
  return dayMonth.format(new Date(iso))
}
