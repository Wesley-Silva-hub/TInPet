import type { LocationInput, updateProfileSchema } from '@tinpet/shared'
import argon2 from 'argon2'
import type { z } from 'zod'
import type { AppDeps } from '../../shared/context'
import {
  meInclude,
  petInclude,
  publicUserInclude,
  roundCoordinate,
  toMe,
  toPet,
  toPublicUser,
} from '../../shared/dto'
import { AppError, notFound } from '../../shared/errors'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

export function createUserService({ db, storage }: AppDeps) {
  const getMe = async (userId: string) => {
    const user = await db.user.findUnique({ where: { id: userId }, include: meInclude })
    if (!user) throw notFound('Usuário')
    return toMe(user, storage)
  }

  return {
    getMe,

    async updateProfile(userId: string, input: z.output<typeof updateProfileSchema>) {
      await db.user.update({
        where: { id: userId },
        data: { ...input, birthDate: new Date(`${input.birthDate}T00:00:00Z`) },
      })
      return getMe(userId)
    },

    /** Grava localização aproximada e registra o consentimento de uso. */
    async setLocation(userId: string, { latitude, longitude }: LocationInput) {
      await db.user.update({
        where: { id: userId },
        data: {
          latitude: roundCoordinate(latitude),
          longitude: roundCoordinate(longitude),
          consentLocationAt: new Date(),
        },
      })
      return getMe(userId)
    },

    /** Revoga o consentimento e apaga as coordenadas. */
    async clearLocation(userId: string) {
      await db.user.update({
        where: { id: userId },
        data: { latitude: null, longitude: null, consentLocationAt: null },
      })
      return getMe(userId)
    },

    async setAvatar(userId: string, file: Buffer) {
      const image = await processImage(file, 512)
      const key = newStorageKey(`avatars/${userId}`, 'webp')
      await storage.put(key, image, 'image/webp')
      const previous = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { avatarKey: true },
      })
      await db.user.update({ where: { id: userId }, data: { avatarKey: key } })
      if (previous.avatarKey) await storage.delete([previous.avatarKey])
      return getMe(userId)
    },

    /** Perfil público de outro dono; invisível se houver bloqueio em qualquer direção. */
    async getPublicProfile(viewerId: string, userId: string) {
      const user = await db.user.findFirst({
        where: {
          id: userId,
          role: 'OWNER',
          blocksMade: { none: { blockedId: viewerId } },
          blocksReceived: { none: { blockerId: viewerId } },
        },
        include: { ...publicUserInclude, pets: { where: { isActive: true }, include: petInclude } },
      })
      if (!user) throw notFound('Usuário')
      return {
        user: toPublicUser(user, storage),
        pets: user.pets.map((pet) => toPet(pet, storage)),
      }
    },

    async lookups() {
      const [maritalStatuses, professions, breeds] = await Promise.all([
        db.maritalStatus.findMany({ orderBy: { name: 'asc' } }),
        db.profession.findMany({ orderBy: { name: 'asc' } }),
        db.breed.findMany({ orderBy: [{ species: 'asc' }, { name: 'asc' }] }),
      ])
      return { maritalStatuses, professions, breeds }
    },

    /** LGPD: portabilidade — tudo o que o TinPet guarda sobre o usuário. */
    async exportData(userId: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          ...meInclude,
          pets: { include: { ...petInclude, swipesMade: true } },
          products: true,
          messages: { orderBy: { createdAt: 'asc' } },
          blocksMade: { select: { blockedId: true, createdAt: true } },
          reportsMade: {
            select: { reportedId: true, reason: true, details: true, createdAt: true },
          },
        },
      })
      if (!user) throw notFound('Usuário')
      return {
        exportedAt: new Date().toISOString(),
        account: {
          ...toMe(user, storage),
          createdAt: user.createdAt.toISOString(),
          consentTermsAt: user.consentTermsAt.toISOString(),
          approximateLocation:
            user.latitude !== null ? { latitude: user.latitude, longitude: user.longitude } : null,
        },
        pets: user.pets.map((pet) => ({
          ...toPet(pet, storage),
          swipes: pet.swipesMade.map((swipe) => ({
            toPetId: swipe.toPetId,
            direction: swipe.direction,
            createdAt: swipe.createdAt.toISOString(),
          })),
        })),
        products: user.products.map((product) => ({
          ...product,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        })),
        messagesSent: user.messages.map((message) => ({
          matchId: message.matchId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
        blocks: user.blocksMade,
        reports: user.reportsMade,
      }
    },

    /** LGPD: exclusão real da conta e de todos os arquivos no storage. */
    async deleteAccount(userId: string, password: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          pets: { select: { photos: { select: { storageKey: true } } } },
          products: { select: { imageKey: true } },
        },
      })
      if (!user) throw notFound('Usuário')
      if (!(await argon2.verify(user.passwordHash, password))) {
        throw new AppError(403, 'INVALID_PASSWORD', 'Senha incorreta')
      }
      const keys = [
        user.avatarKey,
        ...user.pets.flatMap((pet) => pet.photos.map((photo) => photo.storageKey)),
        ...user.products.map((product) => product.imageKey),
      ].filter((key): key is string => Boolean(key))

      // Cascata no banco remove pets, fotos, swipes, matches, mensagens, produtos e tokens
      await db.user.delete({ where: { id: userId } })
      await storage.delete(keys)
    },
  }
}
