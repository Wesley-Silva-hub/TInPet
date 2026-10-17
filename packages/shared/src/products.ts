import { z } from 'zod'
import { paginationQuerySchema } from './common'
import { speciesSchema } from './pets'

export const productCategories = [
  'FOOD',
  'ACCESSORIES',
  'TOYS',
  'HYGIENE',
  'HEALTH',
  'SERVICES',
  'OTHER',
] as const
export const productCategorySchema = z.enum(productCategories)
export type ProductCategory = z.infer<typeof productCategorySchema>

export const productCategoryLabels: Record<ProductCategory, string> = {
  FOOD: 'Rações e alimentos',
  ACCESSORIES: 'Acessórios',
  TOYS: 'Brinquedos',
  HYGIENE: 'Higiene e cuidados',
  HEALTH: 'Saúde e medicamentos',
  SERVICES: 'Serviços',
  OTHER: 'Outros',
}

/** Preço sempre em centavos (inteiro), nunca float. */
export const productInputSchema = z.object({
  title: z.string().trim().min(3, 'Título muito curto').max(120),
  description: z.string().trim().max(2000),
  priceCents: z.number().int().min(0).max(100_000_000),
  category: productCategorySchema,
  externalLink: z.url('Link inválido').max(500).nullable(),
  isActive: z.boolean(),
  /** Espécies atendidas (vazio = todas). Opcional para não apagar no PATCH. */
  species: z.array(speciesSchema).max(6).optional(),
})
export type ProductInput = z.input<typeof productInputSchema>

export const productUpdateSchema = productInputSchema.partial()

export const productsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  category: productCategorySchema.optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  companyId: z.uuid().optional(),
  species: speciesSchema.optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
})
export type ProductsQuery = z.input<typeof productsQuerySchema>

export const companyKinds = ['PETSHOP', 'VET_CLINIC', 'GROOMING', 'STORE', 'OTHER'] as const
export const companyKindSchema = z.enum(companyKinds)
export type CompanyKind = z.infer<typeof companyKindSchema>

export const companyKindLabels: Record<CompanyKind, string> = {
  PETSHOP: 'Pet shop',
  VET_CLINIC: 'Clínica veterinária',
  GROOMING: 'Banho e tosa',
  STORE: 'Loja de acessórios',
  OTHER: 'Outros serviços',
}

/** Perfil público da loja, editado pela empresa. */
export const storeProfileInputSchema = z.object({
  tradeName: z.string().trim().min(2).max(120),
  kind: companyKindSchema,
  description: z.string().trim().max(500),
  neighborhood: z.string().trim().max(80),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(20).nullable(),
  website: z.url('Link inválido').max(300).nullable(),
  delivers: z.boolean(),
})
export type StoreProfileInput = z.input<typeof storeProfileInputSchema>

export const storeSummarySchema = z.object({
  id: z.uuid(),
  tradeName: z.string(),
  kind: companyKindSchema,
  description: z.string(),
  city: z.string().nullable(),
  neighborhood: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  delivers: z.boolean(),
  logoUrl: z.string().nullable(),
  /** Distância aproximada até o usuário (nula sem localização de um dos lados). */
  distanceKm: z.number().int().nullable(),
  productCount: z.number().int(),
})
export type StoreSummary = z.infer<typeof storeSummarySchema>

export const storesQuerySchema = z.object({
  kind: companyKindSchema.optional(),
  q: z.string().trim().max(100).optional(),
  maxDistanceKm: z.coerce.number().int().min(1).max(500).optional(),
})

export const productSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  priceCents: z.number().int(),
  category: productCategorySchema,
  imageUrl: z.string().nullable(),
  externalLink: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  species: z.array(speciesSchema),
  /** Distância até a loja (nula sem localização de um dos lados ou para visitantes). */
  distanceKm: z.number().int().nullable(),
  company: z.object({
    id: z.uuid(),
    tradeName: z.string(),
    kind: companyKindSchema,
    neighborhood: z.string(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    delivers: z.boolean(),
  }),
})
export type Product = z.infer<typeof productSchema>

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const recommendedProductSchema = productSchema.extend({ reasons: z.array(z.string()) })
export type RecommendedProduct = z.infer<typeof recommendedProductSchema>

/** Mensagem pronta para o WhatsApp da loja (número com ou sem DDI 55). */
export function whatsappLink(phone: string | null, message: string): string | null {
  const digits = phone?.replace(/\D/g, '')
  if (!digits || digits.length < 10) return null
  const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}
