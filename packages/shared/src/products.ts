import { z } from 'zod'
import { paginationQuerySchema } from './common'

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
})
export type ProductInput = z.input<typeof productInputSchema>

export const productUpdateSchema = productInputSchema.partial()

export const productsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  category: productCategorySchema.optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  companyId: z.uuid().optional(),
})
export type ProductsQuery = z.input<typeof productsQuerySchema>

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
  company: z.object({
    id: z.uuid(),
    tradeName: z.string(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
  }),
})
export type Product = z.infer<typeof productSchema>

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
