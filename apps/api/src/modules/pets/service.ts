import { MAX_PET_PHOTOS, type petInputSchema, type petUpdateSchema } from '@tinpet/shared'
import type { z } from 'zod'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { petInclude, toPet } from '../../shared/dto'
import { badRequest, forbidden, notFound } from '../../shared/errors'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

export const MAX_PETS_PER_OWNER = 10

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00Z`)

export function createPetService({ db, storage }: AppDeps) {
  /** Garante que o pet existe e pertence ao usuário. */
  async function ownedPet(user: AuthUser, petId: string) {
    const pet = await db.pet.findUnique({ where: { id: petId }, include: petInclude })
    if (!pet) throw notFound('Pet')
    if (pet.ownerId !== user.id) throw forbidden('Só o dono pode alterar este pet')
    return pet
  }

  async function assertBreedMatchesSpecies(breedId: number | null | undefined, species: string) {
    if (breedId == null) return
    const breed = await db.breed.findUnique({ where: { id: breedId } })
    if (!breed || breed.species !== species) {
      throw badRequest('INVALID_BREED', 'Raça não corresponde à espécie')
    }
  }

  return {
    ownedPet,

    async listMine(user: AuthUser) {
      const pets = await db.pet.findMany({
        where: { ownerId: user.id },
        include: petInclude,
        orderBy: { createdAt: 'asc' },
      })
      return pets.map((pet) => toPet(pet, storage))
    },

    async create(user: AuthUser, input: z.output<typeof petInputSchema>) {
      if (user.role !== 'OWNER') throw forbidden('Apenas donos de pets podem cadastrar pets')
      const count = await db.pet.count({ where: { ownerId: user.id } })
      if (count >= MAX_PETS_PER_OWNER) {
        throw badRequest('PET_LIMIT', `Limite de ${MAX_PETS_PER_OWNER} pets por conta`)
      }
      await assertBreedMatchesSpecies(input.breedId, input.species)
      const pet = await db.pet.create({
        data: { ...input, ownerId: user.id, birthDate: toDate(input.birthDate) },
        include: petInclude,
      })
      return toPet(pet, storage)
    },

    /** Pet inativo só é visível para o próprio dono. */
    async get(user: AuthUser, petId: string) {
      const pet = await db.pet.findFirst({
        where: {
          id: petId,
          owner: {
            blocksMade: { none: { blockedId: user.id } },
            blocksReceived: { none: { blockerId: user.id } },
          },
        },
        include: petInclude,
      })
      if (!pet || (!pet.isActive && pet.ownerId !== user.id)) throw notFound('Pet')
      return toPet(pet, storage)
    },

    async update(user: AuthUser, petId: string, input: z.output<typeof petUpdateSchema>) {
      const current = await ownedPet(user, petId)
      await assertBreedMatchesSpecies(
        input.breedId === undefined ? current.breedId : input.breedId,
        input.species ?? current.species,
      )
      const pet = await db.pet.update({
        where: { id: petId },
        data: { ...input, birthDate: toDate(input.birthDate) },
        include: petInclude,
      })
      return toPet(pet, storage)
    },

    async remove(user: AuthUser, petId: string) {
      const pet = await ownedPet(user, petId)
      await db.pet.delete({ where: { id: petId } })
      await storage.delete(pet.photos.map((photo) => photo.storageKey))
    },

    async addPhoto(user: AuthUser, petId: string, file: Buffer) {
      const pet = await ownedPet(user, petId)
      if (pet.photos.length >= MAX_PET_PHOTOS) {
        throw badRequest('PHOTO_LIMIT', `Máximo de ${MAX_PET_PHOTOS} fotos por pet`)
      }
      const image = await processImage(file)
      const key = newStorageKey(`pets/${petId}`, 'webp')
      await storage.put(key, image, 'image/webp')
      const lastPosition = pet.photos.at(-1)?.position ?? -1
      await db.petPhoto.create({ data: { petId, storageKey: key, position: lastPosition + 1 } })
      return toPet(await ownedPet(user, petId), storage)
    },

    async removePhoto(user: AuthUser, petId: string, photoId: string) {
      const pet = await ownedPet(user, petId)
      const photo = pet.photos.find((item) => item.id === photoId)
      if (!photo) throw notFound('Foto')
      await db.petPhoto.delete({ where: { id: photoId } })
      await storage.delete([photo.storageKey])
      return toPet(await ownedPet(user, petId), storage)
    },
  }
}
