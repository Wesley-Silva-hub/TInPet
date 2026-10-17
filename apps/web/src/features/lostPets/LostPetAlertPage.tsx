import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type LostPetAlertDetail, type Sighting, sightingInputSchema } from '@tinpet/shared'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  MapPin,
  MessageCircle,
  Navigation,
  PartyPopper,
  QrCode,
  Share2,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { api, errorMessage } from '../../lib/api'
import { currentPosition } from '../../lib/geolocation'
import { timeAgo } from '../../lib/time'
import { PetPhoto, RewardBadge } from './LostPetsPage'
import { lostPetsKey, shareAlert, useLostPet } from './queries'

/** Chuva de patinhas quando o pet volta para casa. */
function Celebration({ name }: { name: string }) {
  const reduceMotion = useReducedMotion()
  const pieces = Array.from({ length: reduceMotion ? 0 : 24 }, (_, index) => index)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex flex-col items-center gap-2 overflow-hidden rounded-card bg-leaf-500 p-6 text-center text-white"
    >
      {pieces.map((piece) => (
        <motion.span
          key={piece}
          aria-hidden
          className="pointer-events-none absolute top-0 text-2xl"
          style={{ left: `${(piece * 37) % 100}%` }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: 260, opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.4, delay: (piece % 8) * 0.15, ease: 'easeIn' }}
        >
          {piece % 3 === 0 ? '🐾' : piece % 3 === 1 ? '💛' : '🎉'}
        </motion.span>
      ))}
      <PartyPopper className="size-10" aria-hidden />
      <p className="font-display text-2xl font-semibold">{name} está em casa!</p>
      <p className="text-white/90">Obrigado a todo mundo que ajudou a procurar.</p>
    </motion.div>
  )
}

function SightingForm({ alert }: { alert: LostPetAlertDetail }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [shareLocation, setShareLocation] = useState(true)
  const send = useMutation({
    mutationFn: async () => {
      const position = shareLocation ? await currentPosition().catch(() => null) : null
      const body = sightingInputSchema.parse({
        message,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      })
      await api(`/lost-pets/${alert.id}/sightings`, { method: 'POST', body })
      return position
    },
    onSuccess: (position) => {
      toast.success(
        position
          ? `Obrigado! O tutor de ${alert.pet.name} recebeu o aviso com o local.`
          : `Obrigado! O tutor de ${alert.pet.name} recebeu o aviso.`,
      )
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: lostPetsKey })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (alert.reportedByMe && !open) {
    return (
      <div className="flex flex-col gap-2 rounded-card border border-leaf-500/40 bg-leaf-500/10 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5 text-leaf-500" aria-hidden /> Você já avisou o tutor.
          Obrigado!
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start text-sm font-semibold text-brand-700 underline dark:text-brand-300"
        >
          Viu de novo? Enviar outro avistamento
        </button>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onSubmit={(event) => {
            event.preventDefault()
            send.mutate()
          }}
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Onde e quando você viu?</span>
            <textarea
              rows={3}
              maxLength={300}
              required
              minLength={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex.: agora há pouco, perto da padaria da Av. Jóquei Clube, indo para a praça"
              className="rounded-2xl border border-line bg-canvas px-4 py-3 focus:border-brand-400 focus:outline-none"
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(event) => setShareLocation(event.target.checked)}
              className="mt-0.5 size-5 accent-brand-500"
            />
            <span>
              Enviar minha localização atual <b>só para o tutor</b> (ajuda a achar o ponto exato)
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" loading={send.isPending} className="flex-1">
              <Eye className="size-4" aria-hidden /> Avisar o tutor
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </motion.form>
      ) : (
        <motion.div key="cta" whileTap={{ scale: 0.97 }}>
          <Button className="w-full py-4 text-lg" onClick={() => setOpen(true)}>
            <Eye className="size-5" aria-hidden /> Vi este pet!
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SightingItem({ sighting }: { sighting: Sighting }) {
  const digits = sighting.contact.replace(/\D/g, '')
  const whatsapp =
    digits.length >= 10 ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      {sighting.reporter ? (
        <Avatar
          src={sighting.reporter.avatarUrl}
          name={sighting.reporter.name}
          className="size-11"
        />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
          <QrCode className="size-5" aria-hidden />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm">
          <b>{sighting.reporter?.name ?? 'Pela plaquinha QR'}</b>{' '}
          <span className="text-muted">· {timeAgo(sighting.createdAt)}</span>
        </p>
        <p>{sighting.message}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {sighting.mapsUrl && (
            <a
              href={sighting.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              <Navigation className="size-3.5" aria-hidden /> Ver no mapa
              {sighting.distanceKm !== null && ` (${sighting.distanceKm} km)`}
            </a>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-leaf-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              <MessageCircle className="size-3.5" aria-hidden /> {sighting.contact}
            </a>
          )}
          {sighting.contact && !whatsapp && (
            <span className="text-sm text-muted">Contato: {sighting.contact}</span>
          )}
        </div>
      </div>
    </li>
  )
}

function OwnerPanel({ alert }: { alert: LostPetAlertDetail }) {
  const queryClient = useQueryClient()
  const resolve = useMutation({
    mutationFn: (status: 'FOUND' | 'CANCELLED') =>
      api(`/lost-pets/${alert.id}/resolve`, { method: 'POST', body: { status } }),
    onSuccess: (_, status) => {
      if (status === 'CANCELLED') toast.success('Alerta encerrado')
      queryClient.invalidateQueries({ queryKey: lostPetsKey })
      queryClient.invalidateQueries({ queryKey: ['pet', alert.pet.id] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <section aria-labelledby="avistamentos" className="flex flex-col gap-3">
      <Button
        className="w-full bg-leaf-500 py-4 text-lg shadow-leaf-500/30 hover:bg-leaf-500 hover:brightness-110"
        loading={resolve.isPending && resolve.variables === 'FOUND'}
        onClick={() => resolve.mutate('FOUND')}
      >
        <PartyPopper className="size-5" aria-hidden /> Encontrei {alert.pet.name}!
      </Button>
      <h2 id="avistamentos" className="flex items-center gap-2 pt-2 text-xl font-semibold">
        <Eye className="size-5 text-brand-500" aria-hidden /> Avistamentos
      </h2>
      {alert.sightings.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-muted">
          Ainda ninguém avisou. Compartilhe o alerta nos grupos do bairro: quanto mais gente, mais
          rápido ele volta.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alert.sightings.map((sighting) => (
            <SightingItem key={sighting.id} sighting={sighting} />
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={resolve.isPending}
        onClick={() => {
          if (window.confirm('Encerrar o alerta sem ter encontrado?')) resolve.mutate('CANCELLED')
        }}
        className="self-center pt-2 text-sm font-semibold text-muted underline"
      >
        Encerrar alerta
      </button>
    </section>
  )
}

export function LostPetAlertPage() {
  const { id } = useParams() as { id: string }
  const alert = useLostPet(id)
  if (alert.isPending) return <LoadingState />
  if (alert.isError) return <ErrorState error={alert.error} onRetry={() => alert.refetch()} />
  const data = alert.data
  const active = data.status === 'ACTIVE'

  const share = async () => {
    try {
      const result = await shareAlert(data)
      if (result === 'copied') toast.success('Texto do alerta copiado. Cole nos grupos do bairro!')
    } catch {
      // Compartilhamento cancelado pela pessoa
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link
        to="/perdidos"
        className="inline-flex items-center gap-1 self-start font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Pets perdidos
      </Link>

      {data.status === 'FOUND' && <Celebration name={data.pet.name} />}
      {data.status === 'CANCELLED' && (
        <p className="rounded-card bg-surface-2 p-4 text-center font-semibold">
          Este alerta foi encerrado pelo tutor.
        </p>
      )}

      <div className="relative overflow-hidden rounded-card">
        <PetPhoto alert={data} className="aspect-square w-full sm:aspect-[4/3]" />
        {active && (
          <span className="absolute top-4 left-4 rotate-[-6deg] rounded-xl border-4 border-white bg-brand-600 px-4 py-1.5 font-display text-2xl font-bold tracking-wide text-white shadow-lg">
            PERDIDO
          </span>
        )}
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-4xl font-semibold">{data.pet.name}</h1>
          {active && <RewardBadge cents={data.rewardCents} />}
        </div>
        <p className="text-muted">
          {[data.pet.breed, `Tutor(a): ${data.owner.name}`].filter(Boolean).join(' · ')}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4 text-brand-500" aria-hidden /> Visto por último em{' '}
            {data.neighborhood}
            {data.distanceKm !== null && !data.isMine && ` (${data.distanceKm} km de você)`}
          </span>
          <span className="text-muted">{timeAgo(data.lastSeenAt)}</span>
        </p>
        {data.description && <p className="whitespace-pre-line text-lg">{data.description}</p>}
      </header>

      {active && (
        <Button variant="secondary" onClick={share}>
          <Share2 className="size-4" aria-hidden /> Compartilhar alerta
        </Button>
      )}
      {active && !data.isMine && <SightingForm alert={data} />}
      {data.isMine && active && <OwnerPanel alert={data} />}
      {!data.isMine && data.sightingCount > 0 && (
        <p className="text-center text-sm text-muted">
          {data.sightingCount}{' '}
          {data.sightingCount === 1 ? 'pessoa já avisou' : 'pessoas já avisaram'} o tutor.
        </p>
      )}
    </div>
  )
}
