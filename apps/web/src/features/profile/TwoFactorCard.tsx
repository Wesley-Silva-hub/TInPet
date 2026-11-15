import type { Me, RecoveryCodes, TwoFactorSetup } from '@tinpet/shared'
import { Copy, Download, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { api, errorMessage } from '../../lib/api'
import { useAuth, useMe } from '../../lib/auth'

/** Códigos de recuperação: aparecem uma única vez, com copiar e baixar. */
function RecoveryCodesBox({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const text = `Códigos de recuperação do TinPet (cada um vale uma vez):\n\n${codes.join('\n')}\n`
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    Object.assign(document.createElement('a'), {
      href: url,
      download: 'tinpet-codigos.txt',
    }).click()
    URL.revokeObjectURL(url)
  }
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border-2 border-sun-400 bg-surface-2 p-4"
      role="alert"
    >
      <p className="font-semibold">Guarde estes códigos agora: eles não aparecem de novo.</p>
      <p className="text-sm text-muted">
        Se perder o celular, cada código entra na sua conta uma única vez.
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="rounded-lg bg-surface px-2 py-1 text-center">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            navigator.clipboard.writeText(text).then(() => toast.success('Códigos copiados'))
          }
        >
          <Copy className="size-4" aria-hidden /> Copiar
        </Button>
        <Button variant="secondary" onClick={download}>
          <Download className="size-4" aria-hidden /> Baixar
        </Button>
        <Button onClick={onClose}>Já guardei</Button>
      </div>
    </div>
  )
}

/** Login em duas etapas com app autenticador (Google Authenticator, Authy, 1Password...). */
export function TwoFactorCard() {
  const me = useMe()
  const { setUser } = useAuth()
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!setup) return
    QRCode.toDataURL(setup.otpauthUrl, { margin: 1, width: 220 }).then(setQr)
  }, [setup])

  const updateMe = (twoFactorEnabled: boolean) => {
    const updated: Me = { ...me, twoFactorEnabled }
    setUser(updated)
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      setSetup(await api<TwoFactorSetup>('/me/2fa/setup', { method: 'POST' }))
      setCode('')
    })

  const confirm = () =>
    run(async () => {
      const result = await api<RecoveryCodes>('/me/2fa/enable', {
        method: 'POST',
        body: { code: code.trim() },
      })
      setCodes(result.recoveryCodes)
      setSetup(null)
      setCode('')
      updateMe(true)
      toast.success('Verificação em duas etapas ligada 🔐')
    })

  const disable = () =>
    run(async () => {
      await api('/me/2fa/disable', { method: 'POST', body: { password, code: code.trim() } })
      setPassword('')
      setCode('')
      updateMe(false)
      toast.success('Verificação em duas etapas desligada')
    })

  const regenerate = () =>
    run(async () => {
      const result = await api<RecoveryCodes>('/me/2fa/recovery-codes', {
        method: 'POST',
        body: { code: code.trim() },
      })
      setCodes(result.recoveryCodes)
      setCode('')
    })

  return (
    <section
      aria-labelledby="dois-fatores"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
    >
      <h2 id="dois-fatores" className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="size-5 text-brand-500" aria-hidden /> Verificação em duas etapas
      </h2>
      <p className="text-sm text-muted">
        Além da senha, o login pede um código do app autenticador do seu celular. Mesmo que
        descubram sua senha, ninguém entra sem o celular.
      </p>

      {codes && <RecoveryCodesBox codes={codes} onClose={() => setCodes(null)} />}

      {!me.twoFactorEnabled && !setup && (
        <Button variant="secondary" loading={busy} onClick={start} className="self-start">
          <ShieldCheck className="size-4" aria-hidden /> Ligar
        </Button>
      )}

      {setup && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
          <ol className="list-decimal pl-5 text-sm">
            <li>Abra o app autenticador (Google Authenticator, Authy, 1Password…).</li>
            <li>Adicione uma conta lendo o QR code abaixo.</li>
            <li>Digite o código de 6 dígitos que aparecer.</li>
          </ol>
          {qr && (
            <img
              src={qr}
              alt="QR code para o app autenticador"
              className="size-44 self-center rounded-xl bg-white p-2"
            />
          )}
          <p className="text-center text-xs text-muted">
            Sem câmera? Digite a chave: <span className="font-mono select-all">{setup.secret}</span>
          </p>
          <Field label="Código de 6 dígitos">
            {(props) => (
              <input
                {...props}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setSetup(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              loading={busy}
              disabled={code.length !== 6}
              onClick={confirm}
            >
              Confirmar e ligar
            </Button>
          </div>
        </div>
      )}

      {me.twoFactorEnabled && !codes && (
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-leaf-500/15 px-3 py-1 text-sm font-semibold text-leaf-500">
            <ShieldCheck className="size-4" aria-hidden /> Ligada
          </p>
          <Field label="Código do app (ou de recuperação)">
            {(props) => (
              <input
                {...props}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                maxLength={11}
              />
            )}
          </Field>
          <Field label="Senha (só para desligar)">
            {(props) => (
              <input
                {...props}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={busy}
              disabled={code.trim().length < 6}
              onClick={regenerate}
            >
              Gerar novos códigos de recuperação
            </Button>
            <Button
              variant="ghost"
              loading={busy}
              disabled={code.trim().length < 6 || !password}
              onClick={disable}
            >
              <ShieldOff className="size-4" aria-hidden /> Desligar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
