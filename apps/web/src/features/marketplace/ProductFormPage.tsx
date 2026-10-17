import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type Product,
  productCategories,
  productCategoryLabels,
  productInputSchema,
} from '@tinpet/shared'
import { ImagePlus } from 'lucide-react'
import { type InputHTMLAttributes, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { ACCEPTED_IMAGES, compressImage } from '../../lib/image'
import { ProductImage } from './MarketplacePage'

/** "1.249,90" → 124990 centavos (NaN se inválido, a validação acusa). */
export function parsePriceToCents(value: string): number {
  const normalized = value
    .replace(/[^\d,.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  if (normalized === '') return Number.NaN
  return Math.round(Number(normalized) * 100)
}

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/** Campo de preço em reais (texto) que entrega centavos ao formulário. */
function PriceInput({
  cents,
  onCents,
  ...props
}: { cents: number; onCents: (cents: number) => void } & InputHTMLAttributes<HTMLInputElement>) {
  const [text, setText] = useState(Number.isFinite(cents) ? centsToInput(cents) : '')
  return (
    <input
      {...props}
      inputMode="decimal"
      placeholder="0,00"
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onCents(parsePriceToCents(event.target.value))
      }}
    />
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  const product = useQuery({
    queryKey: ['products', 'mine', id],
    queryFn: async () => {
      const mine = await api<Product[]>('/products/mine')
      const found = mine.find((item) => item.id === id)
      if (!found) throw new Error('Produto não encontrado')
      return found
    },
    enabled: Boolean(id),
  })
  if (id && product.isPending) return <LoadingState />
  if (id && product.isError)
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />
  return <ProductForm key={product.data?.id ?? 'novo'} product={product.data} />
}

function ProductForm({ product }: { product: Product | undefined }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imageInput = useRef<HTMLInputElement>(null)
  const form = useForm({
    resolver: zodResolver(productInputSchema),
    defaultValues: {
      title: product?.title ?? '',
      description: product?.description ?? '',
      priceCents: product?.priceCents ?? Number.NaN,
      category: product?.category ?? 'FOOD',
      externalLink: product?.externalLink ?? null,
      isActive: product?.isActive ?? true,
    },
  })
  const { errors, isSubmitting } = form.formState
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const save = form.handleSubmit(async (values) => {
    try {
      if (product) {
        await api<Product>(`/products/${product.id}`, { method: 'PATCH', body: values })
        toast.success('Produto atualizado')
        navigate('/empresa')
      } else {
        const created = await api<Product>('/products', { method: 'POST', body: values })
        toast.success('Produto criado! Adicione uma imagem.')
        navigate(`/empresa/produtos/${created.id}`, { replace: true })
      }
      invalidate()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const upload = useMutation({
    mutationFn: async (file: File) =>
      api<Product>(`/products/${product?.id}/image`, {
        method: 'PUT',
        file: await compressImage(file),
      }),
    onSuccess: () => {
      toast.success('Imagem atualizada')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: () => api(`/products/${product?.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Produto excluído')
      invalidate()
      navigate('/empresa', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={product ? 'Editar produto' : 'Novo produto'} />
      {product && (
        <div className="flex items-center gap-4">
          <ProductImage product={product} className="size-28 rounded-2xl" />
          <Button
            variant="secondary"
            loading={upload.isPending}
            onClick={() => imageInput.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />{' '}
            {product.imageUrl ? 'Trocar imagem' : 'Adicionar imagem'}
          </Button>
          <input
            ref={imageInput}
            type="file"
            accept={ACCEPTED_IMAGES}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) upload.mutate(file)
              event.target.value = ''
            }}
          />
        </div>
      )}
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Título" error={errors.title?.message}>
          {(props) => <input {...props} {...form.register('title')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" error={errors.priceCents && 'Informe um preço válido'}>
            {(props) => (
              <Controller
                control={form.control}
                name="priceCents"
                render={({ field }) => (
                  <PriceInput
                    {...props}
                    cents={field.value}
                    onCents={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </Field>
          <Field label="Categoria" error={errors.category?.message}>
            {(props) => (
              <select {...props} {...form.register('category')}>
                {productCategories.map((value) => (
                  <option key={value} value={value}>
                    {productCategoryLabels[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Descrição" error={errors.description?.message}>
          {(props) => (
            <textarea rows={5} maxLength={2000} {...props} {...form.register('description')} />
          )}
        </Field>
        <Field
          label="Link do produto (opcional)"
          hint="Página na sua loja online"
          error={errors.externalLink?.message}
        >
          {(props) => (
            <input
              type="url"
              placeholder="https://"
              {...props}
              {...form.register('externalLink', {
                setValueAs: (value: string) => value.trim() || null,
              })}
            />
          )}
        </Field>
        <label className="flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-brand-500"
            {...form.register('isActive')}
          />
          Publicado na vitrine
        </label>
        <Button type="submit" loading={isSubmitting}>
          {product ? 'Salvar' : 'Criar produto'}
        </Button>
      </form>
      {product && (
        <Button
          variant="ghost"
          className="text-brand-700"
          loading={remove.isPending}
          onClick={() => {
            if (window.confirm('Excluir este produto?')) remove.mutate()
          }}
        >
          Excluir produto
        </Button>
      )}
    </div>
  )
}
