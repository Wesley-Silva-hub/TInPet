import { Download, LogOut, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { api, apiBlob, applySession, errorMessage } from '../../lib/api'
import { useAuth, useMe } from '../../lib/auth'
import { AppearanceCard } from './AppearanceCard'
import { LocationCard } from './LocationCard'

/** Conta e privacidade (LGPD): sair, exportar dados e excluir a conta. */
export function SettingsPage() {
  const me = useMe()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    try {
      const url = URL.createObjectURL(await apiBlob('/me/export'))
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: 'meus-dados-tinpet.json',
      })
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (
      !window.confirm(
        'Excluir sua conta para sempre? Pets, fotos, matches e conversas serão apagados.',
      )
    )
      return
    setDeleting(true)
    try {
      await api('/me', { method: 'DELETE', body: { password } })
      applySession(null)
      toast.success('Conta excluída. Sentiremos sua falta 🐾')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title="Configurações" />
      <section className="rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted">Conectado como</p>
        <p className="font-semibold">{me.email}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => logout().then(() => navigate('/'))}
        >
          <LogOut className="size-4" aria-hidden /> Sair
        </Button>
      </section>

      <AppearanceCard />

      {me.role === 'OWNER' && <LocationCard />}

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Seus dados</h2>
        <p className="text-sm text-muted">
          Baixe uma cópia de tudo o que o TinPet guarda sobre você (LGPD).
        </p>
        <Button variant="secondary" loading={exporting} onClick={exportData}>
          <Download className="size-4" aria-hidden /> Exportar meus dados
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-card border-2 border-brand-200 bg-surface p-5 dark:border-brand-700">
        <h2 className="text-lg font-semibold text-brand-700 dark:text-brand-400">Excluir conta</h2>
        <p className="text-sm text-muted">
          A exclusão é definitiva: removemos seus dados, pets, fotos, matches e mensagens.
        </p>
        <Field label="Confirme sua senha">
          {(props) => (
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              {...props}
            />
          )}
        </Field>
        <Button variant="danger" loading={deleting} disabled={!password} onClick={deleteAccount}>
          <Trash2 className="size-4" aria-hidden /> Excluir minha conta
        </Button>
      </section>
    </div>
  )
}
