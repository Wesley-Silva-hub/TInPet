import { z } from 'zod'
import { paginationQuerySchema } from './common'

export const notificationTypes = [
  'POST_LIKE',
  'POST_COMMENT',
  'MATCH',
  'LOST_PET_NEARBY',
  'LOST_PET_SIGHTING',
  'LOST_PET_FOUND',
  'EVENT_NEARBY',
  'EVENT_CANCELLED',
  'VACCINE_DUE',
  'MEDICATION_TODAY',
  'WALK_REQUESTED',
  'WALK_ACCEPTED',
  'WALK_DECLINED',
  'WALK_CANCELLED',
] as const
export const notificationTypeSchema = z.enum(notificationTypes)
export type NotificationType = z.infer<typeof notificationTypeSchema>

export const notificationSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  actor: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }).nullable(),
  postId: z.uuid().nullable(),
  postImageUrl: z.string().nullable(),
  matchId: z.uuid().nullable(),
  petId: z.uuid().nullable(),
  alertId: z.uuid().nullable(),
  eventId: z.uuid().nullable(),
  walkId: z.uuid().nullable(),
  petName: z.string().nullable(),
  petPhotoUrl: z.string().nullable(),
  preview: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationsQuerySchema = paginationQuerySchema

export const unreadCountSchema = z.object({ unread: z.number().int() })

/** Texto e destino de cada aviso (lista de notificações e toasts em tempo real). */
export function describeNotification(notification: Notification): { text: string; to: string } {
  const name = notification.actor?.name.split(' ')[0] ?? 'Alguém'
  switch (notification.type) {
    case 'POST_LIKE':
      return { text: `${name} curtiu sua publicação.`, to: `/posts/${notification.postId}` }
    case 'POST_COMMENT':
      return {
        text: `${name} comentou: “${notification.preview}”`,
        to: `/posts/${notification.postId}`,
      }
    case 'MATCH':
      return {
        text: `Deu match com o pet de ${name}! Que tal dar um oi?`,
        to: `/matches/${notification.matchId}`,
      }
    case 'LOST_PET_NEARBY':
      return {
        text: `🚨 Pet perdido perto de você: ${notification.preview}. Fique de olho!`,
        to: `/perdidos/${notification.alertId}`,
      }
    case 'LOST_PET_SIGHTING':
      return {
        text: notification.actor
          ? `${name} viu ${notification.petName ?? 'seu pet'}: “${notification.preview}”`
          : `Alguém achou ${notification.petName ?? 'seu pet'} pela plaquinha: “${notification.preview}”`,
        to: notification.alertId
          ? `/perdidos/${notification.alertId}`
          : `/pets/${notification.petId}`,
      }
    case 'LOST_PET_FOUND':
      return {
        text: `${notification.petName ?? 'O pet'} foi encontrado! Obrigado por ajudar ${name} 💛`,
        to: `/perdidos/${notification.alertId}`,
      }
    case 'EVENT_NEARBY':
      return {
        text: `📅 Evento perto de você: ${notification.preview}`,
        to: `/eventos/${notification.eventId}`,
      }
    case 'EVENT_CANCELLED':
      return {
        text: `Evento cancelado: ${notification.preview}`,
        to: `/eventos/${notification.eventId}`,
      }
    case 'VACCINE_DUE':
      return {
        text: `💉 ${notification.preview}. Já marcou o veterinário?`,
        to: `/pets/${notification.petId}/editar`,
      }
    case 'MEDICATION_TODAY':
      return {
        text: `💊 Remédio hoje: ${notification.preview}`,
        to: `/pets/${notification.petId}/editar`,
      }
    case 'WALK_REQUESTED':
      return { text: `🦮 ${name} pediu um passeio: ${notification.preview}`, to: '/passeios' }
    case 'WALK_ACCEPTED':
      return { text: `✅ ${name} aceitou o passeio: ${notification.preview}`, to: '/passeios' }
    case 'WALK_DECLINED':
      return { text: `${name} não pode fazer o passeio: ${notification.preview}`, to: '/passeios' }
    case 'WALK_CANCELLED':
      return { text: `${name} cancelou o passeio: ${notification.preview}`, to: '/passeios' }
  }
}

/** Inscrição do navegador (PushSubscription.toJSON()). */
export const pushSubscriptionInputSchema = z.object({
  endpoint: z.url().max(2000).startsWith('https://', 'Endereço de push inválido'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
})
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>

export const pushConfigSchema = z.object({
  enabled: z.boolean(),
  /** Chave VAPID pública (applicationServerKey). */
  publicKey: z.string().nullable(),
})
export type PushConfig = z.infer<typeof pushConfigSchema>
