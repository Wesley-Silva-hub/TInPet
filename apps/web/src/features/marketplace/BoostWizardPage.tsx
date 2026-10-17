import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  discountedPrice,
  formatPrice,
  type MyPromotion,
  type Product,
  type Promotion,
  promotionDurationLabels,
  promotionDurations,
  promotionInputSchema,
  type Species,
  speciesLabels,
} from '@tinpet/shared'
import { ArrowLeft, ArrowRight, Check, Rocket } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { myProductsKey } from './keys'
import { ProductImage } from './ProductTile'
import { SponsoredCard } from './SponsoredCard'

const steps = ['Produto', 'Oferta', 'Público', 'Publicar'] as const
const audienceSpecies: Species[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'RODENT']
const discountPresets = [10, 15, 20, 30, 50]

type Duration = (typeof promotionDurations)[number]

export function BoostWizardPage() {
  const products = useQuery({
    queryKey: myProductsKey,
    queryFn: () => api<Product[]>('/products/mine'),
  })
  if (products.isPending) return <LoadingState />
  if (products.isError)
    return <ErrorState error={products.error} onRetry={() => products.refetch()} />
  const active = products.data.filter((product) => product.isActive)
  if (active.length === 0) {
    return (
      <EmptyState icon={<Rocket className="size-8" />} title="Publique um produto primeiro">
        <Link to="/empresa/produtos/novo" className="font-semibold text-brand-600 underline">
          Criar meu primeiro produto
        </Link>
      </EmptyState>
    )
  }
  return <BoostWizard products={active} />
}

function BoostWizard({ products }: { products: Product[] }) {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const [params] = useSearchParams()
  const initial = products.find((product) => product.id === params.get('produto')) ?? products[0]

  const [step, setStep] = useState(params.get('produto') ? 1 : 0)
  const [productId, setProductId] = useState(initial?.id ?? '')
  const [headline, setHeadline] = useState('')
  const [discount, setDiscount] = useState<number | null>(20)
  const [coupon, setCoupon] = useState('')
  const [species, setSpecies] = useState<Species[]>(initial?.species ?? [])
  const [radiusKm, setRadiusKm] = useState(10)
  const [duration, setDuration] = useState<Duration>(24)

  const product = products.find((item) => item.id === productId) ?? products[0]
  const suggestedHeadline = discount
    ? `${product?.title.split(' ').slice(0, 3).join(' ')} com ${discount}% off`
    : `Novidade: ${product?.title.split(' ').slice(0, 4).join(' ')}`

  const input = {
    productId,
    headline: headline.trim() || suggestedHeadline,
    discountPercent: discount,
    couponCode: coupon.trim() || null,
    species,
    radiusKm,
    durationHours: duration,
  }
  const parsed = promotionInputSchema.safeParse(input)
  const issue = (field: string) =>
    parsed.success ? undefined : parsed.error.issues.find((item) => item.path[0] === field)?.message

  const preview: Promotion | null = useMemo(() => {
    if (!product) return null
    return {
      id: 'previa',
      headline: input.headline,
      discountPercent: discount,
      hasCoupon: Boolean(coupon.trim()),
      endsAt: new Date(Date.now() + duration * 3_600_000).toISOString(),
      finalPriceCents: discountedPrice(product.priceCents, discount),
      product: { ...product, distanceKm: 2 },
    }
  }, [product, input.headline, discount, coupon, duration])

  const publish = useMutation({
    mutationFn: () => api<MyPromotion>('/promotions', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
      toast.success('Seu anúncio está no ar! 🚀 Acompanhe os resultados no painel.')
      navigate('/empresa')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const canAdvance =
    step === 0
      ? Boolean(productId)
      : step === 1
        ? !issue('headline') && !issue('discountPercent') && !issue('couponCode')
        : true

  const toggleSpecies = (value: Species) =>
    setSpecies((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )

  const optionClass = (active: boolean) =>
    `rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
        : 'border-line bg-surface hover:border-brand-200'
    }`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="⚡ Impulsionar" />

      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            <button
              type="button"
              disabled={index > step}
              onClick={() => setStep(index)}
              className="flex w-full flex-col gap-1.5 text-left text-xs font-semibold disabled:cursor-default"
            >
              <span
                className={`h-1.5 rounded-full transition-colors ${index <= step ? 'bg-brand-500' : 'bg-line'}`}
              />
              <span className={index === step ? 'text-ink' : 'text-muted'}>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {step === 0 && (
              <>
                <h2 className="text-xl font-semibold">Qual produto vai brilhar?</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {products.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={item.id === productId}
                        onClick={() => {
                          setProductId(item.id)
                          setSpecies(item.species)
                        }}
                        className={`flex w-full items-center gap-3 rounded-card border-2 p-3 text-left transition ${
                          item.id === productId
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                            : 'border-line bg-surface hover:border-brand-200'
                        }`}
                      >
                        <ProductImage product={item} className="size-14 shrink-0 rounded-2xl" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-semibold">{item.title}</span>
                          <span className="text-sm text-muted">{formatPrice(item.priceCents)}</span>
                        </span>
                        {item.id === productId && (
                          <Check className="size-5 shrink-0 text-brand-500" aria-hidden />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold">Monte uma oferta irresistível</h2>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-semibold">Desconto</legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={discount === null}
                      onClick={() => setDiscount(null)}
                      className={optionClass(discount === null)}
                    >
                      Sem desconto
                    </button>
                    {discountPresets.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={discount === value}
                        onClick={() => setDiscount(value)}
                        className={optionClass(discount === value)}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                  {product && discount && (
                    <p className="text-sm text-muted">
                      De {formatPrice(product.priceCents)} por{' '}
                      <b className="text-brand-600">
                        {formatPrice(discountedPrice(product.priceCents, discount))}
                      </b>
                    </p>
                  )}
                </fieldset>
                <label className="flex flex-col gap-1.5">
                  <span className="font-semibold">Chamada</span>
                  <input
                    value={headline}
                    maxLength={80}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder={suggestedHeadline}
                    className="rounded-2xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none"
                  />
                  <span className="text-sm text-muted">
                    Em branco, usamos a sugestão. Frases curtas convertem mais.
                  </span>
                  {headline && issue('headline') && (
                    <span className="text-sm font-semibold text-brand-700">
                      {issue('headline')}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-semibold">Cupom (opcional)</span>
                  <input
                    value={coupon}
                    maxLength={30}
                    onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                    placeholder="EX.: MIAU10"
                    className="rounded-2xl border border-line bg-surface px-4 py-3 font-mono tracking-widest uppercase focus:border-brand-400 focus:outline-none"
                  />
                  <span className="text-sm text-muted">
                    O tutor "raspa" para revelar, e você vê no painel quantos pegaram.
                  </span>
                  {issue('couponCode') && (
                    <span className="text-sm font-semibold text-brand-700">
                      {issue('couponCode')}
                    </span>
                  )}
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-xl font-semibold">Quem deve ver?</h2>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-semibold">Tutores de</legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={species.length === 0}
                      onClick={() => setSpecies([])}
                      className={optionClass(species.length === 0)}
                    >
                      Todos os pets
                    </button>
                    {audienceSpecies.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={species.includes(value)}
                        onClick={() => toggleSpecies(value)}
                        className={optionClass(species.includes(value))}
                      >
                        {speciesLabels[value]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-2">
                  <span className="flex justify-between font-semibold">
                    Raio de alcance <span className="text-brand-600">{radiusKm} km</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={radiusKm}
                    onChange={(event) => setRadiusKm(Number(event.target.value))}
                    className="accent-brand-500"
                  />
                  {!me.hasLocation && (
                    <span className="text-sm font-semibold text-brand-700">
                      Sua loja ainda não tem localização: o anúncio aparece sem limite de raio.{' '}
                      <Link to="/empresa/perfil" className="underline">
                        Definir agora
                      </Link>
                    </span>
                  )}
                </label>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-semibold">Duração</legend>
                  <div className="flex flex-wrap gap-2">
                    {promotionDurations.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={duration === value}
                        onClick={() => setDuration(value)}
                        className={optionClass(duration === value)}
                      >
                        {promotionDurationLabels[value]}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-muted">
                    Ofertas de até 12 h ganham o selo ⚡ relâmpago e a contagem regressiva.
                  </span>
                </fieldset>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-xl font-semibold">Tudo pronto para decolar</h2>
                <dl className="divide-y divide-line rounded-card border border-line bg-surface">
                  {[
                    ['Produto', product?.title],
                    ['Chamada', input.headline],
                    ['Desconto', discount ? `${discount}%` : 'Sem desconto'],
                    ['Cupom', input.couponCode ?? 'Sem cupom'],
                    [
                      'Público',
                      species.length === 0
                        ? 'Todos os tutores'
                        : species.map((value) => speciesLabels[value]).join(', '),
                    ],
                    ['Alcance', `${radiusKm} km da loja`],
                    ['Duração', promotionDurationLabels[duration]],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 px-4 py-3">
                      <dt className="text-muted">{label}</dt>
                      <dd className="text-right font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm text-muted">
                  Aparece no feed Início (identificado como patrocinado), no carrossel de ofertas da
                  Loja e na página do produto. Você pode pausar quando quiser.
                </p>
              </>
            )}

            <div className="flex justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="size-4" aria-hidden /> Voltar
                </Button>
              ) : (
                <span />
              )}
              {step < steps.length - 1 ? (
                <Button disabled={!canAdvance} onClick={() => setStep(step + 1)}>
                  Continuar <ArrowRight className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button
                  loading={publish.isPending}
                  disabled={!parsed.success}
                  onClick={() => publish.mutate()}
                >
                  <Rocket className="size-4" aria-hidden /> Publicar anúncio
                </Button>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        {preview && (
          <aside
            aria-label="Prévia do anúncio"
            className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start"
          >
            <p className="text-sm font-bold tracking-wide text-muted uppercase">
              Prévia no feed do tutor
            </p>
            <SponsoredCard offer={preview} preview />
          </aside>
        )}
      </div>
    </div>
  )
}
