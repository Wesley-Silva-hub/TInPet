import { PawPrint } from 'lucide-react'
import { Link } from 'react-router'
import { useMe } from '../../lib/auth'
import { LocationCard } from './LocationCard'

/** Primeiros passos do tutor: localização e primeiro pet. */
export function OnboardingPage() {
  const me = useMe()
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Boas-vindas, {me.name.split(' ')[0]}! 🐾</h1>
        <p className="mt-1 text-muted">Dois passos rápidos e você já pode começar a dar likes.</p>
      </div>
      <LocationCard />
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <PawPrint className="size-5 text-brand-500" aria-hidden /> Seu pet
        </h2>
        <p className="text-sm text-muted">Conte sobre ele e adicione fotos caprichadas.</p>
        <Link
          to="/pets/novo"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 font-semibold text-white hover:bg-brand-600"
        >
          Cadastrar meu pet
        </Link>
      </section>
    </div>
  )
}
