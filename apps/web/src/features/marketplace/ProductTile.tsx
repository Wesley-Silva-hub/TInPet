import { formatPrice, type Product } from '@tinpet/shared'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router'

export function ProductImage({ product, className }: { product: Product; className: string }) {
  return product.imageUrl ? (
    <img src={product.imageUrl} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} grid place-items-center bg-surface-2 text-4xl`} aria-hidden>
      🛍️
    </div>
  )
}

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      to={`/loja/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="overflow-hidden">
        <ProductImage
          product={product}
          className="aspect-square w-full transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="flex items-center gap-1 truncate text-xs text-muted">
          {product.company.tradeName}
          {product.distanceKm !== null && (
            <>
              {' · '}
              <MapPin className="size-3 shrink-0" aria-hidden /> {product.distanceKm} km
            </>
          )}
        </p>
        <h3 className="line-clamp-2 font-sans text-sm font-semibold">{product.title}</h3>
        <p className="mt-auto pt-1 font-display text-lg font-semibold text-brand-600">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  )
}
