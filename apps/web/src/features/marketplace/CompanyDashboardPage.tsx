import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPrice, type Product, productCategoryLabels } from '@tinpet/shared'
import { PackagePlus, Store } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { ProductImage } from './MarketplacePage'

export const myProductsKey = ['products', 'mine'] as const

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
      toast.success(product.isActive ? 'Anúncio publicado' : 'Anúncio pausado')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const newButton = (
    <Link
      to="/empresa/produtos/novo"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600"
    >
      <PackagePlus className="size-5" aria-hidden /> Novo produto
    </Link>
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={me.company?.tradeName ?? 'Minha loja'} action={newButton} />
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
              <button
                type="button"
                role="switch"
                aria-checked={product.isActive}
                aria-label={`Anúncio ${product.title} ativo`}
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
    </div>
  )
}
