import { useMutation, useQuery } from '@tanstack/react-query'
import { formatPrice, type PublicTag, tagFoundInputSchema } from '@tinpet/shared'
import { HeartHandshake, Send } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { currentPosition } from '../../lib/geolocation'

const inputClass =
  'rounded-2xl border border-line bg-surface px-4 py-3 focus:border-brand-400 focus:outline-none'

/** Página aberta da plaquinha QR: quem achou o pet avisa o tutor sem criar conta. */
export function PublicTagPage() {
  const { code } = useParams() as { code: string }
  const tag = useQuery({
    queryKey: ['tag', code],
    queryFn: () => api<PublicTag>(`/tags/${code}`),
    retry: false,
  })

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex justify-center border-b border-line bg-surface py-3">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
        {tag.isPending ? (
          <LoadingState />
        ) : tag.isError ? (
          <ErrorState error={tag.error} onRetry={() => tag.refetch()} />
        ) : (
          <TagContent code={code} tag={tag.data} />
        )}
      </main>
    </div>
  )
}

function TagContent({ code, tag }: { code: string; tag: PublicTag }) {
  const reduceMotion = useReducedMotion()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [shareLocation, setShareLocation] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: async () => {
      const position = shareLocation ? await currentPosition().catch(() => null) : null
      const parsed = tagFoundInputSchema.safeParse({
        message,
        contact,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira o recado')
      await api(`/tags/${code}/found`, { method: 'POST', body: parsed.data })
    },
    onError: (cause) => setError(errorMessage(cause)),
  })

  if (send.isSuccess) {
    return (
      <motion.div
        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-3 rounded-card bg-leaf-500 p-6 text-center text-white"
      >
        <HeartHandshake className="size-12" aria-hidden />
        <p className="font-display text-2xl font-semibold">Obrigado! 💛</p>
        <p>
          {tag.ownerFirstName} já recebeu seu recado no celular. Se puder, fique com {tag.petName}{' '}
          por perto até o contato.
        </p>
        <Link
          to="/cadastro"
          className="mt-2 rounded-full bg-white px-5 py-2.5 font-semibold text-leaf-500"
        >
          Conhecer o TinPet
        </Link>
      </motion.div>
    )
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-card">
        {tag.photoUrl ? (
          <img src={tag.photoUrl} alt={tag.petName} className="aspect-square w-full object-cover" />
        ) : (
          <div
            className="grid aspect-square w-full place-items-center bg-brand-100 text-8xl"
            aria-hidden
          >
            🐾
          </div>
        )}
        {tag.isLost && (
          <span className="absolute top-4 left-4 rotate-[-6deg] rounded-xl border-4 border-white bg-brand-600 px-4 py-1.5 font-display text-2xl font-bold text-white shadow-lg">
            ESTOU PERDIDO
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold">Oi, eu sou {tag.petName}!</h1>
        <p className="text-lg">
          {tag.isLost
            ? `${tag.ownerFirstName} está me procurando. Você pode avisar que me encontrou?`
            : `Se você me encontrou sozinho por aí, avise ${tag.ownerFirstName}. Leva 10 segundos.`}
        </p>
        {tag.isLost && tag.rewardCents ? (
          <p className="self-center rounded-full bg-sun-400 px-4 py-1.5 font-bold text-ink">
            Recompensa de {formatPrice(tag.rewardCents)}
          </p>
        ) : null}
        {tag.description && <p className="text-muted">{tag.description}</p>}
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          send.mutate()
        }}
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Onde {tag.petName} está?</span>
          <textarea
            rows={3}
            maxLength={300}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ex.: está comigo, na Rua X, perto do mercado"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Seu WhatsApp ou telefone (opcional)</span>
          <input
            type="tel"
            maxLength={80}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="(86) 90000-0000"
            className={inputClass}
          />
          <span className="text-sm text-muted">
            Só {tag.ownerFirstName} vê, para combinar a entrega.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={shareLocation}
            onChange={(event) => setShareLocation(event.target.checked)}
            className="mt-0.5 size-5 accent-brand-500"
          />
          Enviar minha localização atual para {tag.ownerFirstName}
        </label>
        {error && (
          <p role="alert" className="font-semibold text-brand-700">
            {error}
          </p>
        )}
        <Button type="submit" loading={send.isPending} className="py-4 text-lg">
          <Send className="size-5" aria-hidden /> Avisar {tag.ownerFirstName}
        </Button>
      </form>
    </>
  )
}
