import { useQuery } from '@tanstack/react-query'
import {
  type CompanyKind,
  companyKindLabels,
  companyKinds,
  type StoreSummary,
} from '@tinpet/shared'
import { MapPin, Search, Store, Truck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api } from '../../lib/api'

export const kindEmoji: Record<CompanyKind, string> = {
  PETSHOP: '🐾',
  VET_CLINIC: '🩺',
  GROOMING: '🛁',
  STORE: '🦴',
  OTHER: '✨',
}

export function useStores(query: { kind?: CompanyKind; q?: string } = {}) {
  return useQuery({
    queryKey: ['stores', query],
    queryFn: () => api<StoreSummary[]>('/stores', { query }),
    staleTime: 5 * 60_000,
  })
}

export function StoreLogo({ store, className }: { store: StoreSummary; className: string }) {
  return store.logoUrl ? (
    <img src={store.logoUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-brand-100 text-2xl`} aria-hidden>
      {kindEmoji[store.kind]}
    </span>
  )
}

export function StoreMeta({ store }: { store: StoreSummary }) {
  const place = [store.neighborhood, store.city].filter(Boolean).join(', ')
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
      {store.distanceKm !== null && (
        <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
          <MapPin className="size-3.5" aria-hidden /> {store.distanceKm} km
        </span>
      )}
      {place && <span>{place}</span>}
      {store.delivers && (
        <span className="inline-flex items-center gap-1 text-leaf-500">
          <Truck className="size-3.5" aria-hidden /> Entrega
        </span>
      )}
    </p>
  )
}

/** Faixa horizontal de lojas próximas (usada na vitrine). */
export function NearbyStores() {
  const stores = useStores()
  const list = stores.data?.filter((store) => store.productCount > 0).slice(0, 10) ?? []
  if (list.length === 0) return null
  return (
    <section aria-labelledby="lojas-perto" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="lojas-perto" className="flex items-center gap-2 text-xl font-semibold">
          <Store className="size-5 text-brand-500" aria-hidden /> Pet shops da região
        </h2>
        <Link to="/lojas" className="font-semibold text-brand-600">
          Ver todos
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {list.map((store) => (
          <li key={store.id} className="w-44 shrink-0 snap-start">
            <Link
              to={`/lojas/${store.id}`}
              className="flex h-full flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <StoreLogo store={store} className="size-16 rounded-full" />
              <span className="line-clamp-2 text-sm font-bold leading-snug">{store.tradeName}</span>
              <span className="text-xs text-muted">{companyKindLabels[store.kind]}</span>
              {store.distanceKm !== null && (
                <span className="mt-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {store.distanceKm} km
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StoresPage() {
  const reduceMotion = useReducedMotion()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<CompanyKind | undefined>()
  const q = useDeferredValue(search.trim())
  const stores = useStores({ kind, q: q || undefined })

  const chip = (value: CompanyKind | undefined, label: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        kind === value ? 'bg-brand-500 text-white' : 'bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader title="Pet shops da região" />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <label htmlFor="busca-lojas" className="sr-only">
          Buscar lojas
        </label>
        <input
          id="busca-lojas"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, bairro ou serviço…"
          className="w-full rounded-full border border-line bg-surface py-3 pr-4 pl-12 focus:border-brand-400 focus:outline-none"
        />
      </div>
      <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <legend className="sr-only">Tipo de loja</legend>
        {chip(undefined, 'Todas')}
        {companyKinds.map((value) =>
          chip(value, `${kindEmoji[value]} ${companyKindLabels[value]}`),
        )}
      </fieldset>

      {stores.isPending ? (
        <LoadingState />
      ) : stores.isError ? (
        <ErrorState error={stores.error} onRetry={() => stores.refetch()} />
      ) : stores.data.length === 0 ? (
        <EmptyState icon={<Store className="size-8" />} title="Nenhuma loja por aqui">
          Tente outro tipo ou busca.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {stores.data.map((store, index) => (
            <motion.li
              key={store.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.04 }}
            >
              <Link
                to={`/lojas/${store.id}`}
                className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <StoreLogo store={store} className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-wide text-brand-700 uppercase dark:text-brand-400">
                    {companyKindLabels[store.kind]}
                  </p>
                  <h2 className="truncate font-sans text-lg font-bold">{store.tradeName}</h2>
                  <StoreMeta store={store} />
                  {store.description && (
                    <p className="mt-1 line-clamp-1 text-sm">{store.description}</p>
                  )}
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
