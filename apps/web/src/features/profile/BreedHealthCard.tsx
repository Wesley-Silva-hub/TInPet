import { BREED_HEALTH_DISCLAIMER, breedHealthFor, type Pet } from '@tinpet/shared'
import { HeartPulse, Info } from 'lucide-react'

/** O que observar na saúde da raça do pet (informativo, com aviso). */
export function BreedHealthCard({ pet }: { pet: Pet }) {
  const health = breedHealthFor(pet.species, pet.breed)
  if (!health) return null
  return (
    <section
      aria-labelledby="saude-raca"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
    >
      <h2 id="saude-raca" className="flex items-center gap-2 text-lg font-semibold">
        <HeartPulse className="size-5 text-brand-500" aria-hidden />
        {pet.breed ? `Saúde da raça: ${pet.breed}` : 'Saúde do pet'}
      </h2>
      {health.watch.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Vale ficar de olho em:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {health.watch.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="rounded-2xl bg-surface-2 p-3 text-sm">
        <span className="font-semibold">Cuidado que mais ajuda: </span>
        {health.care}
      </p>
      <p className="flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {BREED_HEALTH_DISCLAIMER}
      </p>
    </section>
  )
}
