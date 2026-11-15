import type { RecoveryCodes, TwoFactorSetup } from '@tinpet/shared'
import argon2 from 'argon2'
import { type AuthUser, hashToken } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { AppError, badRequest, conflict, notFound } from '../../shared/errors'
import {
  newRecoveryCodes,
  newTotpSecret,
  normalizeRecoveryCode,
  otpauthUrl,
  SecretBox,
  verifyTotp,
} from '../../shared/totp'

export const invalidCode = () => new AppError(401, 'INVALID_CODE', 'Código inválido ou já usado')

/** Login em duas etapas com app autenticador (TOTP) e códigos de recuperação. */
export function createMfaService({ db, env }: AppDeps) {
  const box = new SecretBox(env.JWT_SECRET)

  async function saveRecoveryCodes(userId: string): Promise<string[]> {
    const codes = newRecoveryCodes()
    await db.$transaction([
      db.recoveryCode.deleteMany({ where: { userId } }),
      db.recoveryCode.createMany({
        data: codes.map((code) => ({ userId, codeHash: hashToken(code) })),
      }),
    ])
    return codes
  }

  /**
   * Confere o código do app (ou um de recuperação) de quem já tem 2FA ligado. As atualizações são
   * condicionais: duas requisições simultâneas com o mesmo código não passam as duas.
   */
  async function checkFactor(userId: string, input: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true },
    })
    if (!user?.totpSecret || !user.totpEnabledAt) return false
    const code = input.replace(/\s/g, '')
    if (/^\d{6}$/.test(code)) {
      const step = verifyTotp(box.open(user.totpSecret), code, user.totpLastStep)
      if (step === null) return false
      const claimed = await db.user.updateMany({
        where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
        data: { totpLastStep: step },
      })
      return claimed.count > 0
    }
    const used = await db.recoveryCode.updateMany({
      where: { userId, codeHash: hashToken(normalizeRecoveryCode(code)), usedAt: null },
      data: { usedAt: new Date() },
    })
    return used.count > 0
  }

  return {
    checkFactor,

    /** Gera o segredo (ainda desligado) para a pessoa ler o QR no app. */
    async setup(user: AuthUser): Promise<TwoFactorSetup> {
      const account = await db.user.findUnique({
        where: { id: user.id },
        select: { email: true, totpEnabledAt: true },
      })
      if (!account) throw notFound('Usuário')
      if (account.totpEnabledAt) throw conflict('MFA_ENABLED', 'O 2FA já está ligado')
      const secret = newTotpSecret()
      await db.user.update({
        where: { id: user.id },
        data: { totpSecret: box.seal(secret), totpLastStep: null },
      })
      return { secret, otpauthUrl: otpauthUrl(secret, account.email) }
    },

    /** Liga o 2FA depois de a pessoa provar que o app gera o código certo. */
    async enable(user: AuthUser, code: string): Promise<RecoveryCodes> {
      const account = await db.user.findUnique({
        where: { id: user.id },
        select: { totpSecret: true, totpEnabledAt: true },
      })
      if (!account?.totpSecret) throw badRequest('MFA_NOT_SETUP', 'Comece a configuração de novo')
      if (account.totpEnabledAt) throw conflict('MFA_ENABLED', 'O 2FA já está ligado')
      const step = verifyTotp(box.open(account.totpSecret), code, null)
      if (step === null) throw invalidCode()
      await db.user.update({
        where: { id: user.id },
        data: { totpEnabledAt: new Date(), totpLastStep: step },
      })
      return { recoveryCodes: await saveRecoveryCodes(user.id) }
    },

    /** Desligar pede a senha e um código válido (quem pegou o celular destravado não desliga). */
    async disable(user: AuthUser, password: string, code: string) {
      const account = await db.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true, totpEnabledAt: true },
      })
      if (!account) throw notFound('Usuário')
      if (!account.totpEnabledAt) throw badRequest('MFA_DISABLED', 'O 2FA não está ligado')
      if (!(await argon2.verify(account.passwordHash, password))) {
        throw new AppError(403, 'INVALID_PASSWORD', 'Senha incorreta')
      }
      if (!(await checkFactor(user.id, code))) throw invalidCode()
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null },
        }),
        db.recoveryCode.deleteMany({ where: { userId: user.id } }),
      ])
    },

    /** Novos códigos de recuperação (os antigos deixam de valer). */
    async regenerateRecoveryCodes(user: AuthUser, code: string): Promise<RecoveryCodes> {
      if (!(await checkFactor(user.id, code))) throw invalidCode()
      return { recoveryCodes: await saveRecoveryCodes(user.id) }
    },
  }
}
