import { useQuery } from '@tanstack/react-query'
import {
  companyKindLabels,
  formatPrice,
  type Product,
  productCategoryLabels,
  speciesLabels,
  whatsappLink,
} from '@tinpet/shared'
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  MessageCircle,
  Truck,
  Zap,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { Countdown, CouponReveal, OfferPrice, useOffers } from './offers'
import { ProductImage } from './ProductTile'

export function ProductPage() {
  const { id } = useParams() as { id: string }
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`),
  })
  const offer = useOffers().data?.find((item) => item.product.id === id)

  if (product.isPending) return <LoadingState />
  if (product.isError) return <ErrorState error={product.error} onRetry={() => product.refetch()} />
  const item = product.data
  const message = offer?.discountPercent
    ? `Olá! Vi "${item.title}" com ${offer.discountPercent}% off no TinPet.`
    : `Olá! Vi "${item.title}" no TinPet.`
  const whatsapp = whatsappLink(item.company.phone, message)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        to="/loja"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Loja
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative">
          <ProductImage product={item} className="aspect-square w-full rounded-card" />
          {offer?.discountPercent && (
            <span className="absolute top-4 right-4 grid size-20 rotate-[-8deg] place-items-center rounded-full bg-brand-500 font-display text-2xl font-bold text-white shadow-lg">
              -{offer.discountPercent}%
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              {productCategoryLabels[item.category]}
            </span>
            {item.species.map((value) => (
              <span
                key={value}
                className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold"
              >
                {speciesLabels[value]}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-semibold">{item.title}</h1>

          {offer ? (
            <div className="flex flex-col gap-2 rounded-card border-2 border-brand-200 bg-brand-50 p-4 dark:border-brand-500/40 dark:bg-brand-500/10">
              <p className="flex items-center justify-between gap-2 text-sm font-bold text-brand-700 dark:text-brand-300">
                <span className="flex items-center gap-1">
                  <Zap className="size-4 fill-sun-400" aria-hidden /> {offer.headline}
                </span>
                <Countdown endsAt={offer.endsAt} />
              </p>
              <div className="text-2xl">
                <OfferPrice offer={offer} />
              </div>
              {offer.hasCoupon && <CouponReveal promotionId={offer.id} />}
            </div>
          ) : (
            <p className="font-display text-3xl font-semibold text-brand-600">
              {formatPrice(item.priceCents)}
            </p>
          )}

          {item.description && <p className="whitespace-pre-line">{item.description}</p>}

          <Link
            to={`/lojas/${item.company.id}`}
            className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{companyKindLabels[item.company.kind]}</p>
              <p className="truncate font-bold">{item.company.tradeName}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                {item.distanceKm !== null && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden /> {item.distanceKm} km de você
                  </span>
                )}
                {item.company.neighborhood && <span>{item.company.neighborhood}</span>}
                {item.company.delivers && (
                  <span className="inline-flex items-center gap-1 text-leaf-500">
                    <Truck className="size-3.5" aria-hidden /> Entrega
                  </span>
                )}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>

          <div className="mt-1 flex flex-col gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leaf-500 px-5 font-semibold text-white hover:brightness-110"
              >
                <MessageCircle className="size-4" aria-hidden /> Pedir pelo WhatsApp
              </a>
            )}
            {item.externalLink && (
              <a
                href={item.externalLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-semibold hover:bg-surface-2"
              >
                Ver na loja online <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </div>
          <p className="text-xs text-muted">
            O TinPet só divulga o anúncio: a compra é feita diretamente com a empresa.
          </p>
        </div>
      </div>
    </div>
  )
}
