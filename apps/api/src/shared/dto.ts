import type { Me, Pet, Product, PublicUser } from '@tinpet/shared'
import { ageFrom, vaccineStatusOf } from '@tinpet/shared'
import type { Prisma } from '../generated/prisma/client'
import { type Coordinates, distanceKm } from './geo'
import type { StorageProvider } from './storage/storage'

// Conversão de registros do banco para os contratos públicos (packages/shared).
// Nada de coordenadas, e-mail ou data de nascimento de terceiros sai daqui.

export const toDateOnly = (date: Date) => date.toISOString().slice(0, 10)

/** Arredonda para 2 casas (~1,1 km): a localização exata nunca é guardada. */
export const roundCoordinate = (value: number) => Math.round(value * 100) / 100

export const petInclude = {
  photos: { orderBy: { position: 'asc' } },
  breed: true,
  // Só a data do reforço: o detalhe das vacinas é privado do tutor
  vaccines: { select: { nextDueAt: true } },
  lostAlerts: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
} satisfies Prisma.PetInclude

type PetWithRelations = Prisma.PetGetPayload<{ include: typeof petInclude }>

export function toPet(pet: PetWithRelations, storage: StorageProvider): Pet {
  return {
    id: pet.id,
    ownerId: pet.ownerId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed?.name ?? null,
    breedId: pet.breedId,
    sex: pet.sex,
    size: pet.size,
    birthDate: pet.birthDate ? toDateOnly(pet.birthDate) : null,
    bio: pet.bio,
    purpose: pet.purpose,
    isActive: pet.isActive,
    vaccineStatus: vaccineStatusOf(pet.vaccines.map((vaccine) => vaccine.nextDueAt)),
    activeAlertId: pet.lostAlerts[0]?.id ?? null,
    photos: pet.photos.map((photo) => ({
      id: photo.id,
      url: storage.publicUrl(photo.storageKey),
      position: photo.position,
    })),
  }
}

export const publicUserInclude = {
  maritalStatus: true,
  profession: true,
} satisfies Prisma.UserInclude

type UserWithLookups = Prisma.UserGetPayload<{ include: typeof publicUserInclude }>

export function toPublicUser(user: UserWithLookups, storage: StorageProvider): PublicUser {
  return {
    id: user.id,
    name: user.name,
    age: ageFrom(user.birthDate),
    bio: user.bio,
    avatarUrl: user.avatarKey ? storage.publicUrl(user.avatarKey) : null,
    city: user.city,
    state: user.state,
    maritalStatus: user.maritalStatus?.name ?? null,
    profession: user.profession?.name ?? null,
  }
}

export const meInclude = { ...publicUserInclude, company: true } satisfies Prisma.UserInclude

type MeWithRelations = Prisma.UserGetPayload<{ include: typeof meInclude }>

export function toMe(user: MeWithRelations, storage: StorageProvider): Me {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    birthDate: toDateOnly(user.birthDate),
    bio: user.bio,
    avatarUrl: user.avatarKey ? storage.publicUrl(user.avatarKey) : null,
    city: user.city,
    state: user.state,
    maritalStatus: user.maritalStatus,
    profession: user.profession,
    hasLocation: user.latitude !== null && user.longitude !== null,
    consentLocationAt: user.consentLocationAt?.toISOString() ?? null,
    company: user.company && {
      tradeName: user.company.tradeName,
      cnpj: user.company.cnpj,
      phone: user.company.phone,
      website: user.company.website,
      kind: user.company.kind,
      description: user.company.description,
      neighborhood: user.company.neighborhood,
      address: user.company.address,
      delivers: user.company.delivers,
    },
  }
}

export const productInclude = {
  company: { include: { company: true } },
} satisfies Prisma.ProductInclude

type ProductWithCompany = Prisma.ProductGetPayload<{ include: typeof productInclude }>

/** A localização de quem vê (opcional) permite mostrar a distância até a loja. */
export function toProduct(
  product: ProductWithCompany,
  storage: StorageProvider,
  viewer: Coordinates | null = null,
): Product {
  const store = product.company.company
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    category: product.category,
    imageUrl: product.imageKey ? storage.publicUrl(product.imageKey) : null,
    externalLink: product.externalLink,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    species: product.species,
    distanceKm: distanceKm(viewer, product.company),
    company: {
      id: product.companyId,
      tradeName: store?.tradeName ?? product.company.name,
      kind: store?.kind ?? 'OTHER',
      neighborhood: store?.neighborhood ?? '',
      phone: store?.phone ?? null,
      website: store?.website ?? null,
      delivers: store?.delivers ?? false,
    },
  }
}

/** Cursor opaco (base64url de JSON) para paginação por keyset. */
export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function decodeCursor<T>(
  cursor: string | undefined,
  guard: (v: unknown) => v is T,
): T | null {
  if (!cursor) return null
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    return guard(value) ? value : null
  } catch {
    return null
  }
}
