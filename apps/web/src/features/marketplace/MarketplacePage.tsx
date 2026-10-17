import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  type Page,
  type Product,
  type ProductCategory,
  productCategories,
  productCategoryLabels,
  type RecommendedProduct,
  type Species,
  speciesLabels,
} from '@tinpet/shared'
import { PackageSearch, Search, Sparkles, Store } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { OffersCarousel } from './offers'
import { ProductTile } from './ProductTile'
import { NearbyStores } from './StoresPage'

type Sort = 'recent' | 'price_asc' | 'price_desc'

const sortLabels: Record<Sort, string> = {
  recent: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
}

const shopSpecies: Species[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'RODENT']

/** "Para o seu pet": recomendações com o motivo em destaque. */
function ForYourPet() {
  const reduceMotion = useReducedMotion()
  const recommended = useQuery({
    queryKey: ['products', 'recommended'],
    queryFn: () => api<RecommendedProduct[]>('/products/recommended'),
    staleTime: 5 * 60_000,
  })
  if (!recommended.data?.length) return null

  return (
    <section aria-labelledby="para-seu-pet" className="flex flex-col gap-3">
      <h2 id="para-seu-pet" className="flex items-center gap-2 text-xl font-semibold">
        <Sparkles className="size-5 text-brand-500" aria-hidden /> Escolhidos para o seu pet
      </h2>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {recommended.data.map((product, index) => (
          <motion.li
            key={product.id}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex w-48 shrink-0 snap-start flex-col gap-2"
          >
            <ProductTile product={product} />
            {product.reasons[0] && (
              <p className="flex items-start gap-1 px-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden /> {product.reasons[0]}
              </p>
            )}
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

export function MarketplacePage() {
  const me = useMe()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProductCategory | undefined>()
  const [species, setSpecies] = useState<Species | undefined>()
  const [sort, setSort] = useState<Sort>('recent')
  const q = useDeferredValue(search.trim())
  const browsing = Boolean(q || category || species)

  const products = useInfiniteQuery({
    queryKey: ['products', { q, category, species, sort }],
    queryFn: ({ pageParam }) =>
      api<Page<Product>>('/products', {
        query: { q, category, species, sort, cursor: pageParam, limit: 12 },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const items = products.data?.pages.flatMap((page) => page.items) ?? []

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-brand-500 text-white' : 'bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loja"
        action={
          <Link
            to="/lojas"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-semibold hover:bg-surface-2"
          >
            <Store className="size-4" aria-hidden /> Pet shops
          </Link>
        }
      />
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

      {!browsing && (
        <>
          <OffersCarousel />
          {me.role === 'OWNER' && <ForYourPet />}
          <NearbyStores />
        </>
      )}

      <section aria-labelledby="vitrine" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="vitrine" className="text-xl font-semibold">
            {browsing ? 'Resultados' : 'Toda a vitrine'}
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Ordenar por</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-full border border-line bg-surface px-3 py-2 font-semibold"
            >
              {(Object.keys(sortLabels) as Sort[]).map((value) => (
                <option key={value} value={value}>
                  {sortLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <legend className="sr-only">Para qual pet</legend>
          {chip(!species, 'Todos os pets', () => setSpecies(undefined))}
          {shopSpecies.map((value) =>
            chip(species === value, speciesLabels[value], () => setSpecies(value)),
          )}
        </fieldset>
        <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <legend className="sr-only">Categorias</legend>
          {chip(!category, 'Tudo', () => setCategory(undefined))}
          {productCategories.map((value) =>
            chip(category === value, productCategoryLabels[value], () => setCategory(value)),
          )}
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
                  <ProductTile product={product} />
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
      </section>
    </div>
  )
}
