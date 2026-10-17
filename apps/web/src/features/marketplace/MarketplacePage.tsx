import { useInfiniteQuery } from '@tanstack/react-query'
import {
  formatPrice,
  type Page,
  type Product,
  type ProductCategory,
  productCategories,
  productCategoryLabels,
} from '@tinpet/shared'
import { PackageSearch, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'

export function ProductImage({ product, className }: { product: Product; className: string }) {
  return product.imageUrl ? (
    <img src={product.imageUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} grid place-items-center bg-surface-2 text-4xl`} aria-hidden>
      🛍️
    </div>
  )
}

export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProductCategory | undefined>()
  const q = useDeferredValue(search.trim())

  const products = useInfiniteQuery({
    queryKey: ['products', { q, category }],
    queryFn: ({ pageParam }) =>
      api<Page<Product>>('/products', { query: { q, category, cursor: pageParam, limit: 12 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const items = products.data?.pages.flatMap((page) => page.items) ?? []

  const chip = (value: ProductCategory | undefined, label: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={category === value}
      onClick={() => setCategory(value)}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        category === value ? 'bg-brand-500 text-white' : 'bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Loja" />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <label htmlFor="busca" className="sr-only">
          Buscar produtos
        </label>
        <input
          id="busca"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ração, brinquedos, banho e tosa…"
          className="w-full rounded-full border border-line bg-surface py-3 pr-4 pl-12 focus:border-brand-400 focus:outline-none"
        />
      </div>
      <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <legend className="sr-only">Categorias</legend>
        {chip(undefined, 'Tudo')}
        {productCategories.map((value) => chip(value, productCategoryLabels[value]))}
      </fieldset>

      {products.isPending ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<PackageSearch className="size-8" />} title="Nada encontrado">
          Tente outra busca ou categoria.
        </EmptyState>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/loja/${product.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <ProductImage product={product} className="aspect-square w-full" />
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="text-xs text-muted">{product.company.tradeName}</p>
                    <h2 className="line-clamp-2 font-sans text-sm font-semibold">
                      {product.title}
                    </h2>
                    <p className="mt-auto pt-1 font-display text-lg font-semibold text-brand-600">
                      {formatPrice(product.priceCents)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {products.hasNextPage && (
            <Button
              variant="secondary"
              className="self-center"
              loading={products.isFetchingNextPage}
              onClick={() => products.fetchNextPage()}
            >
              Carregar mais
            </Button>
          )}
        </>
      )}
    </div>
  )
}
