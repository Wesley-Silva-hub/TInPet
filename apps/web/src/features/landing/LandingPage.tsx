import { ArrowRight, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { Logo, LogoMark } from '../../components/Logo'

/** Um dia comum no TinPet: cada horário é um recurso que existe no app. */
const day = [
  {
    time: '07:30',
    title: 'Lembrete do vermífugo',
    text: 'A dose do dia aparece nas notificações, e o reforço da vacina avisa uma semana antes.',
  },
  {
    time: '09:00',
    title: 'Passeio com a Sofia, da rua de cima',
    text: 'Passeadores do bairro com preço e dias na mesa. Você pede, ela aceita, e o pagamento é entre vocês.',
  },
  {
    time: '16:00',
    title: 'Cãominhada no Parque da Cidadania',
    text: 'Encontros, feiras de adoção e mutirões de vacina marcados por tutores e pet shops a até 10 km.',
  },
  {
    time: '19:40',
    title: 'A Mel sumiu perto do Jóquei',
    text: 'Quem mora a até 10 km recebe o alerta na hora. Viu a Mel? Um toque em “Vi este pet” e a tutora fica sabendo.',
  },
  {
    time: '21:15',
    title: 'Deu match com a Luna',
    text: 'Pets compatíveis por perto, para fazer amizade ou para cruzamento responsável. Aí é só combinar no chat.',
  },
]

/** O que fica com você e o que aparece para os outros. */
const privacy = [
  ['Onde você mora', 'Sua localização', '“a 2 km”'],
  ['Sua idade', 'Data de nascimento', 'Só a idade'],
  ['Fotos', 'Do jeito que você tirou', 'Sem os dados de GPS da câmera'],
  ['Saúde do pet', 'Carteira, remédios, consultas', 'Só o selo “vacinas em dia”'],
] as const

/** A plaquinha de coleira desenhada: o recurso que dá a cara do TinPet. */
function TagIllustration() {
  return (
    <div className="relative flex w-40 flex-col items-center sm:w-44" aria-hidden>
      <span className="h-6 w-6 rounded-full border-[5px] border-ink/80" />
      <div className="-mt-1.5 flex aspect-square w-full flex-col items-center justify-center rounded-full bg-sun-400 text-ink shadow-xl ring-4 ring-sun-500/40">
        <span className="font-display text-3xl font-extrabold">Mel</span>
        <span className="text-xs font-bold">Se me achar,</span>
        <span className="text-xs font-bold">escaneie:</span>
        {/* QR estilizado: só desenho, o de verdade é gerado por pet */}
        <svg viewBox="0 0 7 7" className="mt-1.5 size-10" shapeRendering="crispEdges" aria-hidden>
          {[
            [0, 0],
            [1, 0],
            [2, 0],
            [4, 0],
            [6, 0],
            [0, 1],
            [2, 1],
            [5, 1],
            [0, 2],
            [1, 2],
            [2, 2],
            [4, 2],
            [6, 2],
            [3, 3],
            [5, 3],
            [0, 4],
            [2, 4],
            [4, 4],
            [6, 4],
            [1, 5],
            [3, 5],
            [4, 5],
            [0, 6],
            [2, 6],
            [5, 6],
            [6, 6],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="fill-ink" />
          ))}
        </svg>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/entrar" className="rounded-full px-4 py-2 font-semibold hover:bg-surface-2">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-4 pb-16 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-12">
          <div>
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight md:text-7xl">
              Seu pet tem vizinhos.
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl">
              O TinPet junta quem tem pet no mesmo bairro: para passear junto, achar um passeador de
              confiança, avisar todo mundo quando um pet some e lembrar da vacina na hora certa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                to="/cadastro"
                className="inline-flex min-h-13 items-center gap-2 rounded-full bg-brand-500 px-7 text-lg font-semibold text-white hover:bg-brand-600"
              >
                Criar conta grátis <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link to="/entrar" className="font-semibold underline underline-offset-4">
                Já tenho conta
              </Link>
            </div>
          </div>

          <figure>
            {/* A plaquinha fica presa na foto (e não na legenda) */}
            <div className="relative">
              <img
                src="/landing/husky.webp"
                alt="Tutora sentada na grama ao lado do seu husky, olhando a paisagem"
                className="aspect-[4/5] w-full rounded-card object-cover md:aspect-[5/6]"
              />
              <div className="absolute -bottom-10 -left-2 sm:-left-8">
                <TagIllustration />
              </div>
            </div>
            <figcaption className="mt-4 ml-40 text-sm text-muted sm:ml-44">
              A plaquinha com QR vai na coleira. Quem acha o pet escaneia, e você recebe o aviso na
              hora, sem expor seu telefone.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="um-dia" className="border-y border-line bg-surface py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_2fr]">
            <div>
              <h2 id="um-dia" className="font-display text-4xl font-extrabold tracking-tight">
                Um dia no TinPet
              </h2>
              <p className="mt-3 text-muted">
                Nada de rede social infinita. O app aparece quando tem algo a ver com o seu pet e
                com a sua rua.
              </p>
            </div>
            <ol className="relative flex flex-col gap-7 border-l-2 border-line pl-6">
              {day.map((item) => (
                <li key={item.time} className="relative">
                  <span
                    className="absolute top-1.5 -left-[1.95rem] size-3.5 rounded-full border-2 border-surface bg-brand-500"
                    aria-hidden
                  />
                  <p className="font-display text-sm font-bold text-brand-600 dark:text-brand-300">
                    {item.time}
                  </p>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-1 max-w-xl text-muted">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="privacidade" className="mx-auto max-w-6xl px-5 py-16">
          <h2 id="privacidade" className="font-display text-4xl font-extrabold tracking-tight">
            O que os vizinhos veem de você
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Pouca coisa, de propósito. Você pode baixar ou apagar tudo quando quiser, em
            Configurações.
          </p>
          <div className="mt-8 overflow-hidden rounded-card border border-line">
            <table className="w-full text-left">
              <thead className="bg-surface-2 text-sm">
                <tr>
                  <th scope="col" className="p-4 font-semibold">
                    <span className="sr-only">Informação</span>
                  </th>
                  <th scope="col" className="p-4 font-semibold">
                    Você vê
                  </th>
                  <th scope="col" className="p-4 font-semibold text-river-600 dark:text-river-400">
                    Os outros veem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {privacy.map(([label, mine, theirs]) => (
                  <tr key={label}>
                    <th scope="row" className="p-4 font-semibold">
                      {label}
                    </th>
                    <td className="p-4 text-muted">{mine}</td>
                    <td className="p-4 font-semibold">{theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="flex flex-col gap-4 rounded-card bg-river-500 p-8 text-white md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 size-6 shrink-0" aria-hidden />
              <div>
                <h2 className="font-display text-2xl font-extrabold">
                  Tem pet shop, clínica ou banho e tosa?
                </h2>
                <p className="mt-1 max-w-xl text-river-50">
                  Sua loja aparece para quem mora perto e tem o pet certo para o seu produto. Oferta
                  impulsionada vem marcada como patrocinada.
                </p>
              </div>
            </div>
            <Link
              to="/cadastro"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 font-semibold text-river-700 hover:bg-river-50"
            >
              Cadastrar minha empresa
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <LogoMark className="size-6 text-ink" /> Projeto open source (MIT) ·{' '}
            <Link to="/termos" className="underline">
              Termos e privacidade
            </Link>
          </p>
          <p>Fotos de banco de imagens livres (CC0); perfis de exemplo são fictícios.</p>
        </div>
      </footer>
    </div>
  )
}
