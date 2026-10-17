import { useMutation, useQuery } from '@tanstack/react-query'
import { formatPrice, type Promotion } from '@tinpet/shared'
import { Check, Copy, MapPin, Ticket, Timer, Zap } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { api, errorMessage } from '../../lib/api'
import { ProductImage } from './ProductTile'

export const offersKey = ['promotions', 'for-you'] as const

export function useOffers(enabled = true) {
  return useQuery({
    queryKey: offersKey,
    queryFn: () => api<Promotion[]>('/promotions/for-you'),
    staleTime: 2 * 60_000,
    enabled,
  })
}

const HOUR_MS = 3_600_000

/** Ofertas que acabam em até 12 h ganham o selo de relâmpago. */
export const isFlash = (offer: Promotion, now = Date.now()) =>
  new Date(offer.endsAt).getTime() - now <= 12 * HOUR_MS

/** "02:14:09" até 24 h; depois, "3 dias". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'encerrada'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  if (days >= 1) return `${days} ${days === 1 ? 'dia' : 'dias'}`
  const pad = (value: number) => String(value).padStart(2, '0')
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}`
}

export function Countdown({ endsAt, className = '' }: { endsAt: string; className?: string }) {
  const end = new Date(endsAt).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <Timer className="size-3.5" aria-hidden />
      <span>
        <span className="sr-only">Termina em </span>
        {formatCountdown(end - now)}
      </span>
    </span>
  )
}

const seenThisSession = new Set<string>()

function sendEvent(promotionId: string, type: 'view' | 'click') {
  // Métrica não pode atrapalhar a navegação: falhas são ignoradas
  api(`/promotions/${promotionId}/events`, { method: 'POST', body: { type } }).catch(() => {})
}

export const trackClick = (promotionId: string) => sendEvent(promotionId, 'click')

/** Conta a visualização quando metade do anúncio aparece na tela (uma vez por sessão). */
export function useTrackView<T extends Element>(promotionId: string, enabled = true) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!enabled || !element || seenThisSession.has(promotionId)) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || seenThisSession.has(promotionId)) return
        seenThisSession.add(promotionId)
        sendEvent(promotionId, 'view')
        observer.disconnect()
      },
      { threshold: 0.5 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [promotionId, enabled])
  return ref
}

/** Botão que "raspa" o cupom: busca o código, anima a revelação e copia. */
export function CouponReveal({ promotionId }: { promotionId: string }) {
  const reduceMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const reveal = useMutation({
    mutationFn: () =>
      api<{ couponCode: string }>(`/promotions/${promotionId}/coupon`, { method: 'POST' }),
    onError: (error) => toast.error(errorMessage(error)),
  })
  const code = reveal.data?.couponCode

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Cupom copiado! Mostre na loja ou cole no WhatsApp.')
    } catch {
      toast(`Seu cupom: ${code}`)
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {code ? (
        <motion.button
          key="code"
          type="button"
          onClick={(event) => {
            event.preventDefault()
            copy()
          }}
          initial={reduceMotion ? false : { rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 px-4 font-mono text-lg font-bold tracking-widest text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          aria-label={`Cupom ${code}. Copiar`}
        >
          {code}
          {copied ? (
            <Check className="size-5 text-leaf-500" aria-hidden />
          ) : (
            <Copy className="size-5" aria-hidden />
          )}
        </motion.button>
      ) : (
        <motion.button
          key="reveal"
          type="button"
          disabled={reveal.isPending}
          onClick={(event) => {
            event.preventDefault()
            reveal.mutate()
          }}
          exit={reduceMotion ? undefined : { rotateX: -90, opacity: 0 }}
          whileTap={{ scale: 0.97 }}
          className="relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-sun-400 px-4 font-semibold text-white shadow-md shadow-brand-500/30 disabled:opacity-70"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 -left-1/2 w-1/3 animate-shine bg-white/30"
          />
          <Ticket className="size-5" aria-hidden /> Revelar cupom
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function DiscountBadge({ offer }: { offer: Promotion }) {
  if (!offer.discountPercent) return null
  return (
    <span className="absolute top-2 left-2 rounded-full bg-brand-500 px-2.5 py-1 text-sm font-bold text-white shadow">
      -{offer.discountPercent}%
    </span>
  )
}

export function OfferPrice({ offer }: { offer: Promotion }) {
  const hasDiscount = offer.finalPriceCents < offer.product.priceCents
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-xl font-semibold text-brand-600">
        {formatPrice(offer.finalPriceCents)}
      </span>
      {hasDiscount && <s className="text-sm text-muted">{formatPrice(offer.product.priceCents)}</s>}
    </p>
  )
}

/** Card compacto do carrossel de ofertas. */
export function OfferCard({ offer }: { offer: Promotion }) {
  const ref = useTrackView<HTMLLIElement>(offer.id)
  const flash = isFlash(offer)
  return (
    <li ref={ref} className="w-60 shrink-0 snap-start">
      <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm">
        <Link
          to={`/loja/${offer.product.id}`}
          onClick={() => trackClick(offer.id)}
          className="group flex flex-1 flex-col"
        >
          <div className="relative">
            <ProductImage
              product={offer.product}
              className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105"
            />
            <DiscountBadge offer={offer} />
            <span
              className={`absolute right-2 bottom-2 rounded-full px-2.5 py-1 text-xs font-bold text-white ${flash ? 'bg-brand-700' : 'bg-black/60'}`}
            >
              <Countdown endsAt={offer.endsAt} />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <p className="flex items-center gap-1 text-xs text-muted">
              <span className="truncate">{offer.product.company.tradeName}</span>
              {offer.product.distanceKm !== null && (
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  · <MapPin className="size-3" aria-hidden /> {offer.product.distanceKm} km
                </span>
              )}
            </p>
            <h3 className="line-clamp-2 font-sans text-sm font-bold leading-snug">
              {offer.headline}
            </h3>
            <div className="mt-auto pt-1">
              <OfferPrice offer={offer} />
            </div>
          </div>
        </Link>
        {offer.hasCoupon && (
          <div className="px-3 pb-3">
            <CouponReveal promotionId={offer.id} />
          </div>
        )}
      </article>
    </li>
  )
}

/** Carrossel "Ofertas perto de você", com as relâmpago primeiro. */
export function OffersCarousel({ title = 'Ofertas perto de você' }: { title?: string }) {
  const offers = useOffers()
  if (!offers.data?.length) return null
  const flashCount = offers.data.filter((offer) => isFlash(offer)).length

  return (
    <section aria-labelledby="ofertas" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ofertas" className="flex items-center gap-2 text-xl font-semibold">
          <Zap className="size-5 fill-sun-400 text-brand-500" aria-hidden /> {title}
        </h2>
        {flashCount > 0 && (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
            {flashCount} relâmpago
          </span>
        )}
      </div>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {offers.data.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </ul>
    </section>
  )
}
