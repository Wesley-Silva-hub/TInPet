import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  formatPrice,
  type MyPromotion,
  type Product,
  type PromotionStatus,
  productCategoryLabels,
} from '@tinpet/shared'
import {
  Eye,
  MousePointerClick,
  PackagePlus,
  Pause,
  Play,
  Rocket,
  Settings2,
  Store,
  Ticket,
  Trash2,
  Zap,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { myProductsKey, myPromotionsKey } from './keys'
import { Countdown } from './offers'
import { ProductImage } from './ProductTile'

const statusStyle: Record<PromotionStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'No ar', className: 'bg-leaf-500/15 text-leaf-500' },
  PAUSED: { label: 'Pausado', className: 'bg-sun-400/20 text-ink' },
  ENDED: { label: 'Encerrado', className: 'bg-surface-2 text-muted' },
}

const ctr = (promotion: Pick<MyPromotion, 'clicks' | 'impressions'>) =>
  promotion.impressions === 0 ? 0 : Math.round((promotion.clicks / promotion.impressions) * 100)

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {icon} {label}
      </span>
      <span className="font-display text-3xl font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function PromotionsPanel() {
  const reduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const promotions = useQuery({
    queryKey: myPromotionsKey,
    queryFn: () => api<MyPromotion[]>('/promotions/mine'),
    // Painel "ao vivo": os números sobem enquanto a loja olha
    refetchInterval: 30_000,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['promotions'] })
  const pause = useMutation({
    mutationFn: (promotion: MyPromotion) =>
      api<MyPromotion>(`/promotions/${promotion.id}`, {
        method: 'PATCH',
        body: { paused: promotion.status === 'ACTIVE' },
      }),
    onSuccess: (promotion) => {
      toast.success(promotion.status === 'PAUSED' ? 'Anúncio pausado' : 'Anúncio de volta ao ar')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Anúncio excluído')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (promotions.isPending) return <LoadingState label="Carregando anúncios…" />
  if (promotions.isError)
    return <ErrorState error={promotions.error} onRetry={() => promotions.refetch()} />

  const list = promotions.data
  const totals = list.reduce(
    (sum, item) => ({
      impressions: sum.impressions + item.impressions,
      clicks: sum.clicks + item.clicks,
      couponReveals: sum.couponReveals + item.couponReveals,
    }),
    { impressions: 0, clicks: 0, couponReveals: 0 },
  )
  const live = list.filter((item) => item.status === 'ACTIVE').length

  if (list.length === 0) {
    return (
      <Link
        to="/empresa/impulsionar"
        className="group relative flex flex-col gap-2 overflow-hidden rounded-card bg-gradient-to-br from-brand-500 to-sun-400 p-6 text-white shadow-lg shadow-brand-500/30"
      >
        <Rocket
          className="absolute -right-4 -bottom-4 size-32 opacity-20 transition group-hover:-translate-y-2 group-hover:rotate-12"
          aria-hidden
        />
        <span className="text-sm font-bold tracking-wide uppercase">Novo</span>
        <span className="font-display text-2xl font-semibold">
          Coloque sua loja no feed dos tutores da região
        </span>
        <span className="max-w-md text-white/90">
          Em 4 passos: escolha o produto, a oferta, quem deve ver e por quanto tempo. Você acompanha
          visualizações, cliques e cupons em tempo real.
        </span>
        <span className="mt-2 inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 font-semibold text-brand-700">
          <Zap className="size-4" aria-hidden /> Impulsionar agora
        </span>
      </Link>
    )
  }

  return (
    <section aria-labelledby="anuncios" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="anuncios" className="flex items-center gap-2 text-xl font-semibold">
          <Zap className="size-5 fill-sun-400 text-brand-500" aria-hidden /> Anúncios
          {live > 0 && (
            <span className="rounded-full bg-leaf-500/15 px-2.5 py-0.5 text-xs font-bold text-leaf-500">
              {live} no ar
            </span>
          )}
        </h2>
        <Link
          to="/empresa/impulsionar"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Rocket className="size-4" aria-hidden /> Novo anúncio
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={<Eye className="size-4" aria-hidden />}
          label="Visualizações"
          value={totals.impressions}
        />
        <Metric
          icon={<MousePointerClick className="size-4" aria-hidden />}
          label="Cliques"
          value={totals.clicks}
        />
        <Metric
          icon={<span aria-hidden>%</span>}
          label="Taxa de clique"
          value={`${ctr(totals)}%`}
        />
        <Metric
          icon={<Ticket className="size-4" aria-hidden />}
          label="Cupons pegos"
          value={totals.couponReveals}
        />
      </div>
      <ul className="flex flex-col gap-3">
        {list.map((promotion, index) => {
          const status = statusStyle[promotion.status]
          return (
            <motion.li
              key={promotion.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 6) * 0.04 }}
              className={`flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center ${promotion.status === 'ENDED' ? 'opacity-70' : ''}`}
            >
              <ProductImage product={promotion.product} className="size-16 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  {promotion.status === 'ACTIVE' && (
                    <Countdown
                      endsAt={promotion.endsAt}
                      className="text-xs font-semibold text-muted"
                    />
                  )}
                </p>
                <p className="mt-1 truncate font-bold">{promotion.headline}</p>
                <p className="flex flex-wrap gap-x-3 text-sm text-muted tabular-nums">
                  <span>
                    {promotion.impressions}{' '}
                    {promotion.impressions === 1 ? 'visualização' : 'visualizações'}
                  </span>
                  <span>
                    {promotion.clicks} {promotion.clicks === 1 ? 'clique' : 'cliques'}
                  </span>
                  <span>{ctr(promotion)}% CTR</span>
                  {promotion.couponCode && (
                    <span>
                      {promotion.couponReveals} {promotion.couponReveals === 1 ? 'cupom' : 'cupons'}{' '}
                      ({promotion.couponCode})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                {promotion.status !== 'ENDED' && (
                  <button
                    type="button"
                    disabled={pause.isPending}
                    onClick={() => pause.mutate(promotion)}
                    aria-label={
                      promotion.status === 'ACTIVE' ? 'Pausar anúncio' : 'Retomar anúncio'
                    }
                    className="grid size-11 place-items-center rounded-full border border-line hover:bg-surface-2"
                  >
                    {promotion.status === 'ACTIVE' ? (
                      <Pause className="size-4" aria-hidden />
                    ) : (
                      <Play className="size-4" aria-hidden />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm('Excluir este anúncio e os resultados dele?'))
                      remove.mutate(promotion.id)
                  }}
                  aria-label="Excluir anúncio"
                  className="grid size-11 place-items-center rounded-full border border-line text-brand-700 hover:bg-surface-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}

export function CompanyDashboardPage() {
  const me = useMe()
  const queryClient = useQueryClient()
  const products = useQuery({
    queryKey: myProductsKey,
    queryFn: () => api<Product[]>('/products/mine'),
  })
  const toggle = useMutation({
    mutationFn: (product: Product) =>
      api<Product>(`/products/${product.id}`, {
        method: 'PATCH',
        body: { isActive: !product.isActive },
      }),
    onSuccess: (product) => {
      toast.success(product.isActive ? 'Produto publicado' : 'Produto pausado')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const profileIncomplete = !me.hasLocation || !me.company?.neighborhood

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={me.company?.tradeName ?? 'Minha loja'}
        action={
          <Link
            to="/empresa/perfil"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-semibold hover:bg-surface-2"
          >
            <Settings2 className="size-4" aria-hidden /> Perfil da loja
          </Link>
        }
      />

      {profileIncomplete && (
        <Link
          to="/empresa/perfil"
          className="rounded-card border border-sun-400/60 bg-sun-400/15 p-4 font-semibold hover:underline"
        >
          📍 Complete o perfil (bairro e localização) para aparecer em "Pet shops da região".
        </Link>
      )}

      <PromotionsPanel />

      <section aria-labelledby="produtos" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="produtos" className="text-xl font-semibold">
            Produtos
          </h2>
          <Link
            to="/empresa/produtos/novo"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            <PackagePlus className="size-4" aria-hidden /> Novo produto
          </Link>
        </div>
        {products.isPending ? (
          <LoadingState />
        ) : products.isError ? (
          <ErrorState error={products.error} onRetry={() => products.refetch()} />
        ) : products.data.length === 0 ? (
          <EmptyState icon={<Store className="size-8" />} title="Sua vitrine está vazia">
            Anuncie seu primeiro produto para aparecer para tutores de pets.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {products.data.map((product) => (
              <li key={product.id} className="flex items-center gap-4 p-4">
                <ProductImage product={product} className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/empresa/produtos/${product.id}`}
                    className="font-semibold hover:underline"
                  >
                    {product.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatPrice(product.priceCents)} · {productCategoryLabels[product.category]}
                  </p>
                </div>
                {product.isActive && (
                  <Link
                    to={`/empresa/impulsionar?produto=${product.id}`}
                    aria-label={`Impulsionar ${product.title}`}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                  >
                    <Zap className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Impulsionar</span>
                  </Link>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={product.isActive}
                  aria-label={`Produto ${product.title} publicado`}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(product)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${product.isActive ? 'bg-leaf-500' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${product.isActive ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
