import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { useMe } from '../../lib/auth'
import { useClearLocation, useShareLocation } from './queries'

/** Consentimento de localização: compartilhar ou revogar a qualquer momento. */
export function LocationCard() {
  const me = useMe()
  const share = useShareLocation()
  const clear = useClearLocation()

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MapPin className="size-5 text-brand-500" aria-hidden /> Localização
      </h2>
      <p className="text-sm text-muted">
        {me.hasLocation
          ? 'Você está compartilhando sua localização aproximada (~1 km). Os outros veem só a distância.'
          : 'Sem localização, o feed não consegue mostrar pets por perto.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={me.hasLocation ? 'secondary' : 'primary'}
          loading={share.isPending}
          onClick={() =>
            share.mutate(undefined, {
              onSuccess: () => toast.success('Localização atualizada'),
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {me.hasLocation ? 'Atualizar localização' : 'Usar minha localização'}
        </Button>
        {me.hasLocation && (
          <Button
            variant="ghost"
            loading={clear.isPending}
            onClick={() =>
              clear.mutate(undefined, { onSuccess: () => toast.success('Localização removida') })
            }
          >
            Parar de compartilhar
          </Button>
        )}
      </div>
    </section>
  )
}
