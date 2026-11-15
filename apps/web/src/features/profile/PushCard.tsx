import { useQuery } from '@tanstack/react-query'
import { BellOff, BellRing, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import {
  currentSubscription,
  disablePush,
  enablePush,
  getPushConfig,
  isIosBrowser,
  pushSupported,
} from '../../lib/push'

/** Avisos no celular mesmo com o TinPet fechado (match, mensagem, pet perdido, lembretes). */
export function PushCard() {
  const supported = pushSupported()
  const config = useQuery({
    queryKey: ['push', 'config'],
    queryFn: getPushConfig,
    enabled: supported,
  })
  const [active, setActive] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    currentSubscription()
      .then((subscription) => setActive(subscription !== null))
      .catch(() => setActive(false))
  }, [supported])

  const toggle = async () => {
    setBusy(true)
    try {
      if (active) {
        await disablePush()
        setActive(false)
        toast.success('Notificações desligadas neste aparelho')
      } else if (config.data?.publicKey) {
        await enablePush(config.data.publicKey)
        setActive(true)
        toast.success('Pronto: os avisos vão chegar neste aparelho.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ativar')
    } finally {
      setBusy(false)
    }
  }

  let content: React.ReactNode
  if (!supported) {
    content = isIosBrowser() ? (
      <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
        No iPhone, instale o TinPet primeiro: toque em Compartilhar e depois em “Adicionar à Tela de
        Início”. Abra pelo ícone e volte aqui.
      </p>
    ) : (
      <p className="text-sm text-muted">Este navegador não aceita notificações push.</p>
    )
  } else if (config.data && !config.data.enabled) {
    content = (
      <p className="text-sm text-muted">As notificações no celular ainda não estão disponíveis.</p>
    )
  } else if (
    typeof Notification !== 'undefined' &&
    Notification.permission === 'denied' &&
    !active
  ) {
    content = (
      <p className="text-sm text-muted">
        As notificações estão bloqueadas para o TinPet. Libere nas configurações do navegador (ícone
        de cadeado ao lado do endereço) e volte aqui.
      </p>
    )
  } else {
    content = (
      <Button
        variant={active ? 'ghost' : 'secondary'}
        loading={busy || active === null || config.isPending}
        onClick={toggle}
        className="self-start"
      >
        {active ? (
          <>
            <BellOff className="size-4" aria-hidden /> Desligar neste aparelho
          </>
        ) : (
          <>
            <BellRing className="size-4" aria-hidden /> Ativar neste aparelho
          </>
        )}
      </Button>
    )
  }

  return (
    <section
      aria-labelledby="push"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
    >
      <h2 id="push" className="flex items-center gap-2 text-lg font-semibold">
        <BellRing className="size-5 text-brand-500" aria-hidden /> Notificações no celular
      </h2>
      <p className="text-sm text-muted">
        Receba match, mensagens, pet perdido perto, eventos, passeios e lembretes de saúde mesmo com
        o app fechado.
      </p>
      {content}
    </section>
  )
}
