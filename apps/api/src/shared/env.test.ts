import { describe, expect, it } from 'vitest'
import { loadEnv, mailDriverOf } from './env'

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(40),
}

describe('variáveis de e-mail', () => {
  it('sem configuração: arquivo em dev e desligado em produção', () => {
    expect(mailDriverOf(loadEnv({ ...base, NODE_ENV: 'development' }))).toBe('file')
    expect(mailDriverOf(loadEnv({ ...base, NODE_ENV: 'production' }))).toBe('none')
  })

  it('variáveis vazias no painel não derrubam a API', () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: 'production',
      MAIL_DRIVER: '',
      APP_URL: '',
      MAIL_FROM: '',
    })
    expect(mailDriverOf(env)).toBe('none')
    expect(env.APP_URL).toBe('http://localhost:5173')
  })

  it('resend exige a chave', () => {
    expect(() => loadEnv({ ...base, MAIL_DRIVER: 'resend' })).toThrow(/RESEND_API_KEY/)
    expect(mailDriverOf(loadEnv({ ...base, MAIL_DRIVER: 'resend', RESEND_API_KEY: 're_x' }))).toBe(
      'resend',
    )
  })
})

describe('APP_URL em produção', () => {
  it('com Resend em produção, exige a URL real do site', () => {
    const prod = { ...base, NODE_ENV: 'production', MAIL_DRIVER: 'resend', RESEND_API_KEY: 're_x' }
    expect(() => loadEnv(prod)).toThrow(/APP_URL/)
    expect(loadEnv({ ...prod, APP_URL: 'https://meu-site.netlify.app' }).APP_URL).toBe(
      'https://meu-site.netlify.app',
    )
  })
})
