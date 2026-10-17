import { Heart, MessageCircleHeart, ShieldCheck, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'

const features = [
  {
    icon: Heart,
    title: 'Deslize e dê match',
    text: 'Pets compatíveis por perto, filtrados por espécie e objetivo: amizade ou cruzamento.',
  },
  {
    icon: MessageCircleHeart,
    title: 'Converse com o tutor',
    text: 'Quando os dois lados curtem, abre um chat em tempo real para combinar o encontro.',
  },
  {
    icon: ShoppingBag,
    title: 'Loja para pets',
    text: 'Ração, acessórios e serviços de empresas parceiras perto de você.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacidade de verdade',
    text: 'Ninguém vê sua localização exata, só a distância aproximada. Seus dados, suas regras.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/entrar" className="rounded-full px-4 py-2 font-semibold hover:bg-surface-2">
          Entrar
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 pt-6 pb-16 md:grid-cols-2 md:pt-16">
          <div>
            <h1 className="text-5xl leading-tight font-bold md:text-6xl">
              O par perfeito para o seu <span className="text-brand-500">pet</span> está a um match.
            </h1>
            <p className="mt-4 text-lg text-muted">
              O TinPet conecta tutores para encontros, amizades e cruzamentos responsáveis. Simples
              como deslizar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className="inline-flex min-h-12 items-center rounded-full bg-brand-500 px-7 text-lg font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600"
              >
                Criar conta grátis
              </Link>
              <Link
                to="/entrar"
                className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-7 text-lg font-semibold hover:bg-surface-2"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs" aria-hidden>
            <div className="absolute inset-0 rotate-6 rounded-card bg-sun-400/80" />
            <div className="absolute inset-0 -rotate-3 rounded-card bg-leaf-500/80" />
            <div className="absolute inset-0 grid place-items-center rounded-card bg-brand-500 text-[9rem] shadow-2xl">
              🐶
            </div>
            <div className="absolute -right-4 -bottom-4 grid size-20 place-items-center rounded-full bg-surface text-brand-500 shadow-xl">
              <Heart className="size-10 fill-current" />
            </div>
          </div>
        </section>

        <section aria-labelledby="como-funciona" className="bg-surface py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 id="como-funciona" className="text-3xl font-semibold">
              Como funciona
            </h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex flex-col gap-2">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 text-center">
          <h2 className="text-3xl font-semibold">Tem uma empresa pet?</h2>
          <p className="mt-2 text-muted">
            Anuncie seus produtos para tutores apaixonados, sem custo nesta fase.
          </p>
          <Link to="/cadastro" className="mt-6 inline-block font-semibold text-brand-600 underline">
            Cadastrar minha empresa
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        TinPet · Projeto open source (MIT) ·{' '}
        <Link to="/termos" className="underline">
          Termos e privacidade
        </Link>
      </footer>
    </div>
  )
}
