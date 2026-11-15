import type { PushConfig } from '@tinpet/shared'
import { api } from './api'

const SW_URL = '/sw.js'

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

/** iPhone/iPad só recebem push com o TinPet instalado na tela inicial. */
export const isIosBrowser = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia('(display-mode: standalone)').matches

/** A chave VAPID vem em base64url; o navegador quer os bytes. */
export function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export const getPushConfig = () => api<PushConfig>('/push/config')

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration(SW_URL)
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** Pede permissão, registra o service worker e inscreve este aparelho na conta. */
export async function enablePush(publicKey: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      'Permissão negada. Libere as notificações do TinPet nas configurações do navegador.',
    )
  }
  const registration = await navigator.serviceWorker.register(SW_URL)
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey),
    }))
  await api('/push/subscriptions', { method: 'POST', body: subscription.toJSON() })
}

/**
 * Tira este aparelho da conta. Chamado também ao sair: quem entrar depois neste navegador não
 * recebe os avisos da conta anterior.
 */
export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await api('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint: subscription.endpoint },
  }).catch(() => undefined)
  await subscription.unsubscribe().catch(() => undefined)
}
