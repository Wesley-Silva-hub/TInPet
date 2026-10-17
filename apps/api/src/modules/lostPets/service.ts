import { randomInt } from 'node:crypto'
import {
  LOST_PET_ALERT_RADIUS_KM,
  type LostPetAlertDetail,
  type LostPetAlertSummary,
  type lostPetAlertInputSchema,
  mapsPointUrl,
  type PublicTag,
  type Sighting,
  type sightingInputSchema,
  type tagFoundInputSchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { roundCoordinate } from '../../shared/dto'
import { badRequest, conflict, forbidden, notFound } from '../../shared/errors'
import { type Coordinates, distanceKm } from '../../shared/geo'
import { createNotifier } from '../notifications/service'

/** Alertas a mostrar na lista "perto de você". */
const LIST_RADIUS_KM = 50
const LIST_LIMIT = 30
/** Teto de vizinhos avisados por alerta (protege o banco e evita spam). */
const MAX_NEIGHBORS = 500
/** 1 grau de latitude ≈ 111 km: janela do filtro grosso antes do Haversine. */
const KM_PER_DEGREE = 111

/** Sem 0/O, 1/I/l: fácil de digitar se o QR estiver gasto. */
const TAG_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TAG_LENGTH = 8

/** Avistamento guarda ~100 m de precisão: o suficiente para procurar, sem ser um rastreador. */
const roundSighting = (value: number | null) =>
  value === null ? null : Math.round(value * 1000) / 1000

const alertInclude = {
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: { select: { name: true } },
      photos: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
    },
  },
  owner: { select: { id: true, name: true, avatarKey: true } },
  _count: { select: { sightings: true } },
} satisfies Prisma.LostPetAlertInclude

type AlertRow = Prisma.LostPetAlertGetPayload<{ include: typeof alertInclude }>

const sightingInclude = {
  reporter: { select: { id: true, name: true, avatarKey: true } },
} satisfies Prisma.PetSightingInclude

type SightingRow = Prisma.PetSightingGetPayload<{ include: typeof sightingInclude }>

export function createLostPetService(deps: AppDeps) {
  const { db, storage } = deps
  const notifier = createNotifier(deps)
  const avatar = (key: string | null) => (key ? storage.publicUrl(key) : null)

  const locationOf = (userId: string): Promise<Coordinates | null> =>
    db.user.findUnique({ where: { id: userId }, select: { latitude: true, longitude: true } })

  const toSummary = (
    row: AlertRow,
    viewerId: string,
    viewer: Coordinates | null,
  ): LostPetAlertSummary => {
    const photo = row.pet.photos[0]?.storageKey
    return {
      id: row.id,
      status: row.status,
      pet: {
        id: row.pet.id,
        name: row.pet.name,
        species: row.pet.species,
        breed: row.pet.breed?.name ?? null,
        photoUrl: photo ? storage.publicUrl(photo) : null,
      },
      owner: { id: row.owner.id, name: row.owner.name, avatarUrl: avatar(row.owner.avatarKey) },
      description: row.description,
      rewardCents: row.rewardCents,
      neighborhood: row.neighborhood,
      distanceKm: distanceKm(viewer, row),
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      sightingCount: row._count.sightings,
      isMine: row.ownerId === viewerId,
    }
  }

  const toSighting = (row: SightingRow, alert: Coordinates | null): Sighting => ({
    id: row.id,
    source: row.source,
    message: row.message,
    contact: row.contact,
    reporter: row.reporter && {
      id: row.reporter.id,
      name: row.reporter.name,
      avatarUrl: avatar(row.reporter.avatarKey),
    },
    mapsUrl:
      row.latitude !== null && row.longitude !== null
        ? mapsPointUrl(row.latitude, row.longitude)
        : null,
    distanceKm: distanceKm(alert, row),
    createdAt: row.createdAt.toISOString(),
  })

  /** Tutores com localização dentro do raio (filtro grosso no banco, fino no Haversine). */
  async function neighborsOf(point: { latitude: number; longitude: number }, ownerId: string) {
    const delta = LOST_PET_ALERT_RADIUS_KM / KM_PER_DEGREE
    const lngDelta = delta / Math.max(0.2, Math.cos((point.latitude * Math.PI) / 180))
    const candidates = await db.user.findMany({
      where: {
        role: 'OWNER',
        id: { not: ownerId },
        latitude: { gte: point.latitude - delta, lte: point.latitude + delta },
        longitude: { gte: point.longitude - lngDelta, lte: point.longitude + lngDelta },
      },
      select: { id: true, latitude: true, longitude: true },
      take: MAX_NEIGHBORS * 2,
    })
    return candidates
      .filter((user) => {
        const km = distanceKm(point, user)
        return km !== null && km <= LOST_PET_ALERT_RADIUS_KM
      })
      .slice(0, MAX_NEIGHBORS)
      .map((user) => user.id)
  }

  async function generateTagCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from(
        { length: TAG_LENGTH },
        () => TAG_ALPHABET[randomInt(TAG_ALPHABET.length)],
      ).join('')
      const taken = await db.pet.count({ where: { tagCode: code } })
      if (taken === 0) return code
    }
    throw conflict('TAG_CODE', 'Não foi possível gerar o código, tente de novo')
  }

  return {
    /** O tutor marca o pet como perdido e os vizinhos são avisados na hora. */
    async create(user: AuthUser, input: z.output<typeof lostPetAlertInputSchema>) {
      const pet = await db.pet.findUnique({
        where: { id: input.petId },
        select: { ownerId: true, name: true },
      })
      if (!pet) throw notFound('Pet')
      if (pet.ownerId !== user.id) throw forbidden('Só o tutor pode criar o alerta')
      const open = await db.lostPetAlert.count({
        where: { petId: input.petId, status: 'ACTIVE' },
      })
      if (open > 0) throw conflict('ALERT_EXISTS', `Já existe um alerta aberto para ${pet.name}`)

      const point =
        input.latitude !== null && input.longitude !== null
          ? { latitude: input.latitude, longitude: input.longitude }
          : await locationOf(user.id)
      if (point?.latitude == null || point.longitude == null) {
        throw badRequest('NO_LOCATION', 'Ative a localização para avisar os vizinhos')
      }
      const latitude = roundCoordinate(point.latitude)
      const longitude = roundCoordinate(point.longitude)
      const row = await db.lostPetAlert.create({
        data: {
          petId: input.petId,
          ownerId: user.id,
          description: input.description,
          rewardCents: input.rewardCents,
          neighborhood: input.neighborhood,
          lastSeenAt: new Date(input.lastSeenAt),
          latitude,
          longitude,
        },
        include: alertInclude,
      })
      const neighbors = await neighborsOf({ latitude, longitude }, user.id)
      await notifier.lostPetNearby(
        row.id,
        user.id,
        neighbors,
        `${pet.name} sumiu perto de ${input.neighborhood}`,
      )
      return { ...toSummary(row, user.id, await locationOf(user.id)), notified: neighbors.length }
    },

    /** Alertas abertos perto de quem está vendo (os meus sempre aparecem). */
    async listNearby(user: AuthUser): Promise<LostPetAlertSummary[]> {
      const viewer = await locationOf(user.id)
      const rows = await db.lostPetAlert.findMany({
        where: { status: 'ACTIVE' },
        include: alertInclude,
        orderBy: { createdAt: 'desc' },
        take: 300,
      })
      return rows
        .map((row) => toSummary(row, user.id, viewer))
        .filter(
          (alert) =>
            alert.isMine || alert.distanceKm === null || alert.distanceKm <= LIST_RADIUS_KM,
        )
        .sort(
          (a, b) =>
            Number(b.isMine) - Number(a.isMine) ||
            (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY),
        )
        .slice(0, LIST_LIMIT)
    },

    async get(user: AuthUser, alertId: string): Promise<LostPetAlertDetail> {
      const row = await db.lostPetAlert.findUnique({
        where: { id: alertId },
        include: alertInclude,
      })
      if (!row) throw notFound('Alerta')
      const isMine = row.ownerId === user.id
      const [viewer, sightings, mine] = await Promise.all([
        locationOf(user.id),
        isMine
          ? db.petSighting.findMany({
              where: { alertId },
              include: sightingInclude,
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
        db.petSighting.count({ where: { alertId, reporterId: user.id } }),
      ])
      return {
        ...toSummary(row, user.id, viewer),
        sightings: sightings.map((sighting) => toSighting(sighting, row)),
        reportedByMe: mine > 0,
      }
    },

    /** "Vi este pet!": o local vai só para o tutor. */
    async reportSighting(
      user: AuthUser,
      alertId: string,
      input: z.output<typeof sightingInputSchema>,
    ) {
      const alert = await db.lostPetAlert.findUnique({ where: { id: alertId } })
      if (!alert) throw notFound('Alerta')
      if (alert.status !== 'ACTIVE') {
        throw badRequest('ALERT_CLOSED', 'Este pet já foi encontrado')
      }
      if (alert.ownerId === user.id) throw forbidden('O tutor não registra avistamento')
      if ((input.latitude === null) !== (input.longitude === null)) {
        throw badRequest('INVALID_LOCATION', 'Localização incompleta')
      }
      await db.petSighting.create({
        data: {
          petId: alert.petId,
          alertId,
          reporterId: user.id,
          source: 'APP',
          message: input.message,
          latitude: roundSighting(input.latitude),
          longitude: roundSighting(input.longitude),
        },
      })
      await notifier.petSighted({
        ownerId: alert.ownerId,
        reporterId: user.id,
        petId: alert.petId,
        alertId,
        message: input.message,
      })
    },

    /** Encerrar: encontrado (agradece quem ajudou) ou cancelado. */
    async resolve(user: AuthUser, alertId: string, status: 'FOUND' | 'CANCELLED') {
      const alert = await db.lostPetAlert.findUnique({ where: { id: alertId } })
      if (!alert) throw notFound('Alerta')
      if (alert.ownerId !== user.id) throw forbidden('Só o tutor pode encerrar o alerta')
      if (alert.status !== 'ACTIVE')
        throw badRequest('ALERT_CLOSED', 'Este alerta já foi encerrado')
      const row = await db.lostPetAlert.update({
        where: { id: alertId },
        data: { status, resolvedAt: new Date() },
        include: alertInclude,
      })
      if (status === 'FOUND') {
        const helpers = await db.petSighting.findMany({
          where: { alertId, reporterId: { not: null } },
          select: { reporterId: true },
        })
        await notifier.lostPetFound(
          alertId,
          user.id,
          helpers.flatMap((helper) => (helper.reporterId ? [helper.reporterId] : [])),
        )
      }
      return toSummary(row, user.id, await locationOf(user.id))
    },

    /** Código da plaquinha QR do pet (gerado na primeira vez). */
    async tagFor(user: AuthUser, petId: string) {
      const pet = await db.pet.findUnique({
        where: { id: petId },
        select: { ownerId: true, tagCode: true },
      })
      if (!pet) throw notFound('Pet')
      if (pet.ownerId !== user.id) throw forbidden('Só o tutor vê a plaquinha')
      if (pet.tagCode) return { tagCode: pet.tagCode }
      const tagCode = await generateTagCode()
      await db.pet.update({ where: { id: petId }, data: { tagCode } })
      return { tagCode }
    },

    /** Página pública da plaquinha: sem login, sem dados do tutor além do primeiro nome. */
    async publicTag(code: string): Promise<PublicTag> {
      const pet = await db.pet.findUnique({
        where: { tagCode: code.toUpperCase() },
        select: {
          name: true,
          species: true,
          photos: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
          owner: { select: { name: true } },
          lostAlerts: {
            where: { status: 'ACTIVE' },
            select: { rewardCents: true, description: true },
            take: 1,
          },
        },
      })
      if (!pet) throw notFound('Plaquinha')
      const alert = pet.lostAlerts[0]
      const photo = pet.photos[0]?.storageKey
      return {
        petName: pet.name,
        species: pet.species,
        photoUrl: photo ? storage.publicUrl(photo) : null,
        ownerFirstName: pet.owner.name.split(' ')[0] ?? pet.owner.name,
        isLost: Boolean(alert),
        rewardCents: alert?.rewardCents ?? null,
        description: alert?.description ?? '',
      }
    },

    /** Alguém achou o pet e escaneou a plaquinha: o tutor recebe o recado na hora. */
    async foundByTag(code: string, input: z.output<typeof tagFoundInputSchema>) {
      const pet = await db.pet.findUnique({
        where: { tagCode: code.toUpperCase() },
        select: {
          id: true,
          ownerId: true,
          lostAlerts: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
        },
      })
      if (!pet) throw notFound('Plaquinha')
      if ((input.latitude === null) !== (input.longitude === null)) {
        throw badRequest('INVALID_LOCATION', 'Localização incompleta')
      }
      const alertId = pet.lostAlerts[0]?.id ?? null
      await db.petSighting.create({
        data: {
          petId: pet.id,
          alertId,
          source: 'TAG',
          message: input.message,
          contact: input.contact,
          latitude: roundSighting(input.latitude),
          longitude: roundSighting(input.longitude),
        },
      })
      const contact = input.contact ? ` · Contato: ${input.contact}` : ''
      await notifier.petSighted({
        ownerId: pet.ownerId,
        reporterId: null,
        petId: pet.id,
        alertId,
        message: `${input.message}${contact}`,
      })
    },

    /** Recados da plaquinha recebidos fora de um alerta (o tutor vê no perfil do pet). */
    async tagReports(user: AuthUser, petId: string): Promise<Sighting[]> {
      const pet = await db.pet.findUnique({ where: { id: petId }, select: { ownerId: true } })
      if (!pet) throw notFound('Pet')
      if (pet.ownerId !== user.id) throw forbidden('Só o tutor vê os recados')
      const rows = await db.petSighting.findMany({
        where: { petId, source: 'TAG' },
        include: sightingInclude,
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return rows.map((row) => toSighting(row, null))
    },
  }
}
