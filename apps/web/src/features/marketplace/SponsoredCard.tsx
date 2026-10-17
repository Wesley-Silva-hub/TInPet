import type { Promotion } from '@tinpet/shared'
import { ChevronRight, MapPin, Store, Ticket, Truck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Countdown, CouponReveal, isFlash, OfferPrice, trackClick, useTrackView } from './offers'
import { ProductImage } from './ProductTile'

interface SponsoredCardProps {
  offer: Promotion
  /** Prévia no assistente da loja: sem links, sem métricas e cupom só ilustrativo. */
  preview?: boolean
}

/** Anúncio nativo no feed: mesmo formato de um post, sempre identificado como patrocinado. */
export function SponsoredCard({ offer, preview = false }: SponsoredCardProps) {
  const reduceMotion = useReducedMotion()
  const ref = useTrackView<HTMLElement>(offer.id, !preview)
  const { product } = offer
  const flash = isFlash(offer)

  const toProduct = (className: string, children: ReactNode) =>
    preview ? (
      <div className={className}>{children}</div>
    ) : (
      <Link to={`/loja/${product.id}`} onClick={() => trackClick(offer.id)} className={className}>
        {children}
      </Link>
    )

  return (
    <motion.article
      ref={ref}
      initial={reduceMotion || preview ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      aria-label={`Patrocinado: ${offer.headline}`}
      className="overflow-hidden rounded-card border border-line bg-surface shadow-sm"
    >
      <header className="flex items-center gap-3 p-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-brand-700">
          <Store className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {preview ? (
            <p className="truncate font-bold">{product.company.tradeName}</p>
          ) : (
            <Link
              to={`/lojas/${product.company.id}`}
              className="block truncate font-bold hover:underline"
            >
              {product.company.tradeName}
            </Link>
          )}
          <p className="flex items-center gap-1 text-xs text-muted">
            Patrocinado
            {product.distanceKm !== null && (
              <>
                {' · '}
                <MapPin className="size-3" aria-hidden /> {product.distanceKm} km
              </>
            )}
            {product.company.delivers && (
              <>
                {' · '}
                <Truck className="size-3" aria-hidden /> entrega
              </>
            )}
          </p>
        </div>
      </header>

      {toProduct(
        'group relative block overflow-hidden',
        <>
          <ProductImage
            product={product}
            className="aspect-square w-full transition duration-700 group-hover:scale-105"
          />
          {offer.discountPercent && (
            <motion.span
              key={offer.discountPercent}
              initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
              whileInView={{ scale: 1, rotate: -8 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.2 }}
              className="absolute top-4 right-4 grid size-20 place-items-center rounded-full bg-brand-500 font-display text-2xl font-bold text-white shadow-lg"
            >
              -{offer.discountPercent}%
            </motion.span>
          )}
          <span
            className={`absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-sm font-bold text-white shadow ${flash ? 'bg-brand-700' : 'bg-black/60'}`}
          >
            {flash && '⚡ '}
            <Countdown endsAt={offer.endsAt} />
          </span>
        </>,
      )}

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-sans text-lg font-bold leading-snug">{offer.headline}</h3>
          <p className="text-sm text-muted">{product.title}</p>
        </div>
        <OfferPrice offer={offer} />
        <div className="flex flex-col gap-2 sm:flex-row">
          {offer.hasCoupon && (
            <div className="flex-1">
              {preview ? (
                <span className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-sun-400 px-4 font-semibold text-white">
                  <Ticket className="size-5" aria-hidden /> Revelar cupom
                </span>
              ) : (
                <CouponReveal promotionId={offer.id} />
              )}
            </div>
          )}
          {toProduct(
            'inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-2xl border border-line px-4 font-semibold hover:bg-surface-2',
            <>
              Ver oferta <ChevronRight className="size-4" aria-hidden />
            </>,
          )}
        </div>
      </div>
    </motion.article>
  )
}
