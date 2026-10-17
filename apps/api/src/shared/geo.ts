export interface Coordinates {
  latitude: number | null
  longitude: number | null
}

/** Distância em km (Haversine). Nula se faltar localização de um dos lados. */
export function distanceKm(a: Coordinates | null, b: Coordinates | null): number | null {
  if (a?.latitude == null || a.longitude == null || b?.latitude == null || b.longitude == null) {
    return null
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  const km = 2 * 6371 * Math.asin(Math.sqrt(h))
  // Coordenadas guardadas com ~1 km de precisão: nunca mostra menos que 1 km
  return Math.max(1, Math.round(km))
}
