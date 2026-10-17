import { formatPrice, type LostPetAlertSummary } from '@tinpet/shared'
import { Eye, MapPin, PawPrint, Siren } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { timeAgo } from '../../lib/time'
import { useLostPets } from './queries'

export function PetPhoto({ alert, className }: { alert: LostPetAlertSummary; className: string }) {
  return alert.pet.photoUrl ? (
    <img src={alert.pet.photoUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-brand-100 text-4xl`} aria-hidden>
      🐾
    </span>
  )
}

export function RewardBadge({ cents }: { cents: number | null }) {
  if (!cents) return null
  return (
    <span className="rounded-full bg-sun-400 px-2.5 py-0.5 text-xs font-bold text-ink">
      Recompensa {formatPrice(cents)}
    </span>
  )
}

function AlertCard({ alert, index }: { alert: LostPetAlertSummary; index: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
    >
      <Link
        to={`/perdidos/${alert.id}`}
        className="flex gap-4 overflow-hidden rounded-card border-2 border-brand-200 bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-brand-500/40"
      >
        <PetPhoto alert={alert} className="size-24 shrink-0 rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-semibold">{alert.pet.name}</span>
            {alert.isMine && (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                Seu alerta
              </span>
            )}
            <RewardBadge cents={alert.rewardCents} />
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {alert.neighborhood}
              {alert.distanceKm !== null && !alert.isMine && ` · ${alert.distanceKm} km`}
            </span>
            <span>Sumiu {timeAgo(alert.lastSeenAt)}</span>
          </p>
          {alert.description && <p className="line-clamp-2 text-sm">{alert.description}</p>}
          {alert.sightingCount > 0 && (
            <p className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-leaf-500">
              <Eye className="size-3.5" aria-hidden /> {alert.sightingCount}{' '}
              {alert.sightingCount === 1 ? 'avistamento' : 'avistamentos'}
            </p>
          )}
        </div>
      </Link>
    </motion.li>
  )
}

export function LostPetsPage() {
  const alerts = useLostPets()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader title="Pets perdidos" />
      <p className="-mt-3 text-muted">
        Alertas abertos perto de você. Viu algum? Um toque em "Vi este pet!" já ajuda muito.
      </p>
      {alerts.isPending ? (
        <LoadingState />
      ) : alerts.isError ? (
        <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
      ) : alerts.data.length === 0 ? (
        <EmptyState icon={<PawPrint className="size-8" />} title="Nenhum pet perdido por perto 💛">
          Que bom! Se um dia o seu sumir, abra o perfil dele e toque em "Marcar como perdido": os
          vizinhos são avisados na hora.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.data.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Faixa urgente no Início: só aparece quando há pet perdido por perto. */
export function LostPetsStrip() {
  const reduceMotion = useReducedMotion()
  const alerts = useLostPets()
  const list = alerts.data?.filter((alert) => !alert.isMine) ?? []
  if (list.length === 0) return null
  return (
    <section
      aria-labelledby="perdidos-perto"
      className="flex flex-col gap-3 rounded-card border-2 border-brand-500/60 bg-brand-50 p-4 dark:bg-brand-500/10"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="perdidos-perto" className="flex items-center gap-2 text-lg font-semibold">
          <motion.span
            animate={reduceMotion ? undefined : { rotate: [0, -12, 12, -12, 0] }}
            transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2.4 }}
            className="inline-flex"
          >
            <Siren className="size-5 text-brand-600" aria-hidden />
          </motion.span>
          {list.length === 1
            ? 'Pet perdido perto de você'
            : `${list.length} pets perdidos perto de você`}
        </h2>
        <Link to="/perdidos" className="text-sm font-semibold text-brand-700 dark:text-brand-300">
          Ver todos
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {list.map((alert) => (
          <li key={alert.id} className="w-56 shrink-0 snap-start">
            <Link
              to={`/perdidos/${alert.id}`}
              className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 shadow-sm transition hover:shadow-md"
            >
              <PetPhoto alert={alert} className="size-14 shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block truncate font-bold">{alert.pet.name}</span>
                <span className="block truncate text-xs text-muted">
                  {alert.neighborhood}
                  {alert.distanceKm !== null && ` · ${alert.distanceKm} km`}
                </span>
                <span className="block text-xs font-semibold text-brand-700 dark:text-brand-300">
                  {timeAgo(alert.lastSeenAt)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
