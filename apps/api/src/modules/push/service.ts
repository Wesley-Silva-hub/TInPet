import type { PushSubscriptionInput } from '@tinpet/shared'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import type { PushPayload } from '../../shared/push'

/** Teto de aparelhos por pessoa (celular, computador do trabalho, tablet...). */
const MAX_DEVICES = 10

/** Inscrições de push e entrega para os aparelhos de cada pessoa. */
export function createPushService({ db, push }: AppDeps) {
  return {
    config() {
      return { enabled: push !== null, publicKey: push?.publicKey ?? null }
    },

    /** O mesmo aparelho (endpoint) passa a ser da conta que está logada nele agora. */
    async subscribe(user: AuthUser, input: PushSubscriptionInput) {
      await db.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
        update: {
          userId: user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          lastUsedAt: new Date(),
        },
      })
      // Mantém só os aparelhos mais recentes
      const extra = await db.pushSubscription.findMany({
        where: { userId: user.id },
        orderBy: { lastUsedAt: 'desc' },
        skip: MAX_DEVICES,
        select: { id: true },
      })
      if (extra.length > 0) {
        await db.pushSubscription.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } })
      }
    },

    async unsubscribe(user: AuthUser, endpoint: string) {
      await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } })
    },
  }
}

/**
 * Manda o mesmo push para todos os aparelhos das pessoas. Aparelho que sumiu (app desinstalado,
 * permissão revogada) é apagado. Nunca lança erro: push é um extra, o aviso no app já foi salvo.
 */
export async function deliverPush(
  { db, push }: Pick<AppDeps, 'db' | 'push'>,
  userIds: string[],
  payload: PushPayload,
) {
  if (!push || userIds.length === 0) return 0
  const targets = await db.pushSubscription.findMany({
    where: { userId: { in: [...new Set(userIds)] } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })
  const results = await Promise.all(
    targets.map(async (target) => ({ id: target.id, result: await push.send(target, payload) })),
  )
  const gone = results.filter((item) => item.result === 'gone').map((item) => item.id)
  if (gone.length > 0) await db.pushSubscription.deleteMany({ where: { id: { in: gone } } })
  return results.filter((item) => item.result === 'sent').length
}
