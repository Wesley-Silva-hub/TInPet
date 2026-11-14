import { distanceKm } from './geo'
import type { Db } from './prisma'

/** Teto de pessoas avisadas por vez (protege o banco e evita spam). */
const MAX_NEIGHBORS = 500
/** 1 grau de latitude ≈ 111 km: janela do filtro grosso antes do Haversine. */
const KM_PER_DEGREE = 111

/**
 * Tutores com localização dentro do raio (filtro grosso no banco, fino no Haversine),
 * sem quem disparou o aviso e sem contas suspensas.
 */
export async function ownersNear(
  db: Db,
  point: { latitude: number; longitude: number },
  radiusKm: number,
  exceptUserId: string,
): Promise<string[]> {
  const delta = radiusKm / KM_PER_DEGREE
  const lngDelta = delta / Math.max(0.2, Math.cos((point.latitude * Math.PI) / 180))
  const candidates = await db.user.findMany({
    where: {
      role: 'OWNER',
      id: { not: exceptUserId },
      suspendedAt: null,
      latitude: { gte: point.latitude - delta, lte: point.latitude + delta },
      longitude: { gte: point.longitude - lngDelta, lte: point.longitude + lngDelta },
    },
    select: { id: true, latitude: true, longitude: true },
    take: MAX_NEIGHBORS * 2,
  })
  return candidates
    .filter((user) => {
      const km = distanceKm(point, user)
      return km !== null && km <= radiusKm
    })
    .slice(0, MAX_NEIGHBORS)
    .map((user) => user.id)
}
