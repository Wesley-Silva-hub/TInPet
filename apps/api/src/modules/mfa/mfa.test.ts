import type { AuthResponse, Me, MfaChallenge, RecoveryCodes, TwoFactorSetup } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { base32Decode, codeAt, stepAt } from '../../shared/totp'
import { auth, db, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

let ip = 0
const login = (email: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: `10.60.0.${++ip}`,
    payload: { email, password: 'senha-segura-123' },
  })

const secondStep = (mfaToken: string, code: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login/2fa',
    remoteAddress: `10.61.0.${++ip}`,
    payload: { mfaToken, code },
  })

/** Código do app autenticador para o passo atual + `offset`. */
const appCode = (secret: string, offset = 0) =>
  codeAt(base32Decode(secret), stepAt(Date.now()) + offset)

async function enableTwoFactor(token: string) {
  const setup = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/me/2fa/setup',
    headers: auth(token),
  })
  const { secret, otpauthUrl } = setup.json<TwoFactorSetup>()
  expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\/TinPet:/)
  const enabled = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/me/2fa/enable',
    headers: auth(token),
    payload: { code: appCode(secret) },
  })
  expect(enabled.statusCode).toBe(200)
  return { secret, recoveryCodes: enabled.json<RecoveryCodes>().recoveryCodes }
}

describe('login em duas etapas', () => {
  it('liga o 2FA, exige o código no login e guarda o segredo cifrado', async () => {
    const { token, user } = await registerOwner(ctx.app)
    const { secret, recoveryCodes } = await enableTwoFactor(token)
    expect(recoveryCodes).toHaveLength(8)
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.totpSecret).not.toContain(secret)

    const me = await ctx.app.inject({ method: 'GET', url: '/api/v1/me', headers: auth(token) })
    expect(me.json<Me>().twoFactorEnabled).toBe(true)

    const first = await login(user.email)
    const challenge = first.json<MfaChallenge>()
    expect(challenge.mfaRequired).toBe(true)
    expect(first.cookies.find((cookie) => cookie.name === 'tinpet_rt')).toBeUndefined()
    // O token da 2ª etapa não abre nada sozinho
    const sneaky = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: auth(challenge.mfaToken),
    })
    expect(sneaky.statusCode).toBe(401)

    expect((await secondStep(challenge.mfaToken, '000000')).statusCode).toBe(401)
    // O código usado para ligar já foi gasto; o do próximo passo vale
    const done = await secondStep(challenge.mfaToken, appCode(secret, 1))
    expect(done.statusCode).toBe(200)
    expect(done.json<AuthResponse>().user.id).toBe(user.id)
    expect(done.cookies.find((cookie) => cookie.name === 'tinpet_rt')).toBeDefined()
    // O mesmo código não serve de novo
    expect((await secondStep(challenge.mfaToken, appCode(secret, 1))).statusCode).toBe(401)
  })

  it('código de recuperação entra uma vez só', async () => {
    const { token, user } = await registerOwner(ctx.app)
    const { recoveryCodes } = await enableTwoFactor(token)
    const recovery = (recoveryCodes[0] as string).toLowerCase().replace('-', ' ')

    const { mfaToken } = (await login(user.email)).json<MfaChallenge>()
    expect((await secondStep(mfaToken, recovery)).statusCode).toBe(200)
    expect((await secondStep(mfaToken, recovery)).statusCode).toBe(401)
  })

  it('desligar exige senha e código; depois o login volta a ser direto', async () => {
    const { token, user } = await registerOwner(ctx.app)
    const { secret } = await enableTwoFactor(token)
    const disable = (password: string, code: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/v1/me/2fa/disable',
        headers: auth(token),
        payload: { password, code },
      })
    expect((await disable('errada', appCode(secret, 1))).statusCode).toBe(403)
    expect((await disable('senha-segura-123', '123456')).statusCode).toBe(401)
    expect((await disable('senha-segura-123', appCode(secret, 1))).statusCode).toBe(204)

    const direct = await login(user.email)
    expect(direct.json<AuthResponse>().accessToken).toBeTruthy()
    expect(await db.recoveryCode.count({ where: { userId: user.id } })).toBe(0)
  })

  it('não liga com código errado nem duas vezes', async () => {
    const { token } = await registerOwner(ctx.app)
    await ctx.app.inject({ method: 'POST', url: '/api/v1/me/2fa/setup', headers: auth(token) })
    const wrong = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/2fa/enable',
      headers: auth(token),
      payload: { code: '000000' },
    })
    expect(wrong.statusCode).toBe(401)

    const other = await registerOwner(ctx.app)
    await enableTwoFactor(other.token)
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/2fa/setup',
      headers: auth(other.token),
    })
    expect(again.statusCode).toBe(409)
  })
})
