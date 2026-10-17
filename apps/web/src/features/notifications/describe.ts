import type { Notification } from '@tinpet/shared'

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
  }
}
