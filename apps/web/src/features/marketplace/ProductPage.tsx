import { useQuery } from '@tanstack/react-query'
import { formatPrice, type Product, productCategoryLabels } from '@tinpet/shared'
import { ArrowLeft, ExternalLink, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { ProductImage } from './MarketplacePage'

export function ProductPage() {
  const { id } = useParams() as { id: string }
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`),
  })
  if (product.isPending) return <LoadingState />
  if (product.isError) return <ErrorState error={product.error} onRetry={() => product.refetch()} />
  const item = product.data
  const digits = item.company.phone?.replace(/\D/g, '')
  // Telefone salvo com ou sem o DDI 55
  const whatsapp =
    digits && (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        to="/loja"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Loja
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage product={item} className="aspect-square w-full rounded-card" />
        <div className="flex flex-col gap-3">
          <span className="self-start rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            {productCategoryLabels[item.category]}
          </span>
          <h1 className="text-3xl font-semibold">{item.title}</h1>
          <p className="font-display text-3xl font-semibold text-brand-600">
            {formatPrice(item.priceCents)}
          </p>
          <p className="text-sm text-muted">Vendido por {item.company.tradeName}</p>
          {item.description && <p className="whitespace-pre-line">{item.description}</p>}
          <div className="mt-2 flex flex-col gap-2">
            {item.externalLink && (
              <a
                href={item.externalLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600"
              >
                Ver na loja <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Vi "${item.title}" no TinPet.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-semibold hover:bg-surface-2"
              >
                <Phone className="size-4" aria-hidden /> Falar com a loja
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
