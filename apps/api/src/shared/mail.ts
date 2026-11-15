import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Env, mailDriverOf } from './env'

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

/** Envio de e-mail atrás de uma interface própria (como o StorageProvider): troca por env. */
export interface MailProvider {
  send(message: MailMessage): Promise<void>
}

/** Desenvolvimento: cada e-mail vira um .html em .data/mail para abrir no navegador. */
export class FileMailProvider implements MailProvider {
  constructor(private readonly dir: string) {}

  async send(message: MailMessage) {
    await mkdir(this.dir, { recursive: true })
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}.html`
    const header = `<!-- Para: ${message.to} | Assunto: ${message.subject} -->\n`
    await writeFile(resolve(this.dir, name), header + message.html, 'utf8')
  }
}

/** Resend pela API HTTP (plano grátis: 3 mil e-mails/mês). Sem dependência nova. */
export class ResendMailProvider implements MailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: this.from, ...message }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Resend respondeu ${response.status}`)
  }
}

/** Testes: guarda os e-mails em memória. */
export class MemoryMailProvider implements MailProvider {
  readonly outbox: MailMessage[] = []

  async send(message: MailMessage) {
    this.outbox.push(message)
  }
}

/** Nulo quando o envio está desligado (a API responde que o recurso não está disponível). */
export function createMail(env: Env): MailProvider | null {
  const driver = mailDriverOf(env)
  if (driver === 'resend')
    return new ResendMailProvider(env.RESEND_API_KEY as string, env.MAIL_FROM)
  if (driver === 'file') return new FileMailProvider(resolve(env.MAIL_LOCAL_DIR))
  return null
}
