/** Posição atual do navegador (só chamada após o usuário clicar e consentir). */
export function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Seu navegador não oferece localização'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Não foi possível obter sua localização. Verifique a permissão.')),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    )
  })
}
