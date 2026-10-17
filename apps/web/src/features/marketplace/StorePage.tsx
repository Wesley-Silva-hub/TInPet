import { useQuery } from '@tanstack/react-query'
import {
  companyKindLabels,
  type Page,
  type Product,
  type StoreSummary,
  whatsappLink,
} from '@tinpet/shared'
import { ArrowLeft, ExternalLink, MessageCircle, Navigation } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { OfferCard, useOffers } from './offers'
import { ProductTile } from './ProductTile'
import { StoreLogo, StoreMeta } from './StoresPage'

/** Link de rota no mapa: endereço completo se houver, senão bairro + cidade. */
export function mapsLink(
  store: Pick<StoreSummary, 'tradeName' | 'address' | 'neighborhood' | 'city'>,
) {
  const place =
    store.address || [store.tradeName, store.neighborhood, store.city].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
}

export function StorePage() {
  const { id } = useParams() as { id: string }
  const store = useQuery({
    queryKey: ['stores', id],
    queryFn: () => api<StoreSummary>(`/stores/${id}`),
  })
  const products = useQuery({
    queryKey: ['products', { companyId: id }],
    queryFn: () => api<Page<Product>>('/products', { query: { companyId: id, limit: 48 } }),
  })
  const offers = (useOffers().data ?? []).filter((offer) => offer.product.company.id === id)

  if (store.isPending) return <LoadingState />
  if (store.isError) return <ErrorState error={store.error} onRetry={() => store.refetch()} />
  const item = store.data
  const whatsapp = whatsappLink(item.phone, `Olá, ${item.tradeName}! Encontrei vocês no TinPet.`)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        to="/lojas"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Pet shops
      </Link>

      <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <StoreLogo store={item} className="size-24 shrink-0 rounded-3xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
            {companyKindLabels[item.kind]}
          </p>
          <h1 className="text-3xl font-semibold">{item.tradeName}</h1>
          <StoreMeta store={item} />
          {item.description && <p className="mt-1">{item.description}</p>}
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leaf-500 px-5 font-semibold text-white hover:brightness-110"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        )}
        <a
          href={mapsLink(item)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-semibold hover:bg-surface-2"
        >
          <Navigation className="size-4" aria-hidden /> Como chegar
        </a>
        {item.website && (
          <a
            href={item.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-semibold hover:bg-surface-2"
          >
            <ExternalLink className="size-4" aria-hidden /> Site
          </a>
        )}
      </div>

      {offers.length > 0 && (
        <section aria-labelledby="ofertas-loja" className="flex flex-col gap-3">
          <h2 id="ofertas-loja" className="text-xl font-semibold">
            ⚡ Ofertas no ar
          </h2>
          <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="vitrine-loja" className="flex flex-col gap-3">
        <h2 id="vitrine-loja" className="text-xl font-semibold">
          Vitrine
        </h2>
        {products.isPending ? (
          <LoadingState />
        ) : products.isError ? (
          <ErrorState error={products.error} onRetry={() => products.refetch()} />
        ) : products.data.items.length === 0 ? (
          <EmptyState icon={<span className="text-3xl">🛍️</span>} title="Vitrine vazia">
            Esta loja ainda não publicou produtos.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <ProductTile product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
