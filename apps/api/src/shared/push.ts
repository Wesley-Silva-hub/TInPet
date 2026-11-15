import webpush from 'web-push'
import type { Env } from './env'

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  /** Caminho no app aberto ao tocar na notificação. */
  url: string
  /** Agrupa avisos do mesmo assunto no celular (o novo substitui o antigo). */
  tag?: string
}

/** Resultado por aparelho: `gone` = inscrição não existe mais e deve ser apagada. */
export type PushResult = 'sent' | 'gone' | 'failed'

/** Envio de push atrás de uma interface própria (como StorageProvider e MailProvider). */
export interface PushSender {
  readonly publicKey: string
  send(target: PushTarget, payload: PushPayload): Promise<PushResult>
}

/** Web Push padrão (VAPID). Funciona com Chrome, Firefox, Edge e Safari (iOS com o app instalado). */
export class WebPushSender implements PushSender {
  constructor(
    readonly publicKey: string,
    private readonly privateKey: string,
    private readonly subject: string,
  ) {}

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: this.subject,
            publicKey: this.publicKey,
            privateKey: this.privateKey,
          },
          TTL: 60 * 60,
          timeout: 10_000,
        },
      )
      return 'sent'
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      return status === 404 || status === 410 ? 'gone' : 'failed'
    }
  }
}

/** Testes: guarda o que seria enviado. Endpoints listados em `gone` simulam aparelho desinstalado. */
export class MemoryPushSender implements PushSender {
  readonly publicKey = 'chave-publica-de-teste'
  readonly sent: { endpoint: string; payload: PushPayload }[] = []
  readonly gone = new Set<string>()

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    if (this.gone.has(target.endpoint)) return 'gone'
    this.sent.push({ endpoint: target.endpoint, payload })
    return 'sent'
  }
}

export function createPush(env: Env): PushSender | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null
  return new WebPushSender(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT)
}
