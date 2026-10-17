import {
  Camera,
  Heart,
  MessageCircleHeart,
  Newspaper,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'

const collage = [
  { src: '/landing/tutor-cao.webp', className: 'left-0 top-8 w-44 sm:w-52 -rotate-6' },
  {
    src: '/landing/tutora-gata.webp',
    className: 'left-36 top-0 w-48 sm:left-48 sm:w-60 rotate-3 z-10',
  },
  { src: '/landing/husky.webp', className: 'left-6 top-60 w-44 sm:top-72 sm:w-56 rotate-2' },
  {
    src: '/landing/casal.webp',
    className: 'left-44 top-64 w-44 sm:left-60 sm:top-80 sm:w-52 -rotate-3',
  },
]

const features = [
  {
    icon: Camera,
    title: 'Feed da comunidade',
    text: 'Compartilhe momentos, curta e comente as fotos de outros tutores.',
    photo: '/landing/casal.webp',
  },
  {
    icon: Heart,
    title: 'Match entre pets',
    text: 'Deslize por pets compatíveis por perto, para amizade ou cruzamento responsável.',
    photo: '/landing/husky.webp',
  },
  {
    icon: MessageCircleHeart,
    title: 'Chat em tempo real',
    text: 'Deu match? Converse com o tutor e combine o primeiro encontro.',
    photo: '/landing/passeio.webp',
  },
  {
    icon: Newspaper,
    title: 'Notícias e dicas',
    text: 'Saúde, comportamento, adoção e eventos, escritos para quem ama pets.',
    photo: '/landing/ave.webp',
  },
]

const safety = [
  'Sua localização exata nunca aparece: os outros veem só a distância aproximada.',
  'Fotos têm os dados de GPS removidos automaticamente.',
  'Bloqueie e denuncie com um toque. Você controla quem fala com você.',
  'Baixe ou apague seus dados quando quiser (LGPD).',
]

export function LandingPage() {
  const reduceMotion = useReducedMotion()
  const rise = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.5, delay },
        }

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/entrar" className="rounded-full px-4 py-2 font-semibold hover:bg-surface-2">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="hidden rounded-full bg-ink px-4 py-2 font-semibold text-canvas sm:inline-block"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-20 md:grid-cols-2 md:pt-14">
          <motion.div {...rise()}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-bold text-brand-700">
              🐾 A rede social dos pets e seus tutores
            </p>
            <h1 className="text-5xl leading-[1.05] font-bold md:text-7xl">
              Onde os pets fazem <span className="text-brand-500">amigos</span> e os tutores,
              também.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted md:text-xl">
              Compartilhe fotos, encontre companhia para passeios e cruzamentos responsáveis,
              converse com tutores perto de você e descubra produtos para o seu melhor amigo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/cadastro"
                  className="inline-flex min-h-14 items-center rounded-full bg-brand-500 px-8 text-lg font-semibold text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600"
                >
                  Criar conta grátis
                </Link>
              </motion.div>
              <Link
                to="/entrar"
                className="inline-flex min-h-14 items-center rounded-full border border-line bg-surface px-8 text-lg font-semibold hover:bg-surface-2"
              >
                Já tenho conta
              </Link>
            </div>
          </motion.div>

          <div
            className="relative mx-auto h-[30rem] w-[22rem] sm:h-[38rem] sm:w-[28rem]"
            aria-hidden
          >
            {collage.map((photo, index) => (
              <motion.img
                key={photo.src}
                src={photo.src}
                alt=""
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{
                  opacity: { delay: index * 0.12, duration: 0.5 },
                  scale: { delay: index * 0.12, duration: 0.5 },
                  y: {
                    delay: 0.8 + index * 0.4,
                    duration: 5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  },
                }}
                className={`absolute aspect-[4/5] rounded-3xl border-4 border-surface object-cover shadow-2xl ${photo.className}`}
              />
            ))}
            <motion.div
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }}
              className="absolute right-0 bottom-16 z-20 flex items-center gap-2 rounded-full bg-surface px-4 py-3 font-semibold shadow-xl"
            >
              <Heart className="size-6 fill-brand-500 text-brand-500" /> Deu match!
            </motion.div>
          </div>
        </section>

        <section aria-labelledby="recursos" className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-5">
            <motion.h2 {...rise()} id="recursos" className="text-4xl font-semibold md:text-5xl">
              Tudo o que o seu pet precisa para fazer sucesso
            </motion.h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text, photo }, index) => (
                <motion.li
                  key={title}
                  {...rise(index * 0.08)}
                  className="group overflow-hidden rounded-card border border-line bg-canvas"
                >
                  <div className="overflow-hidden">
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex flex-col gap-2 p-5">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p className="text-muted">{text}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center">
          <motion.img
            {...rise()}
            src="/landing/passeio.webp"
            alt="Senhor passeando de carro com seus dois cães"
            loading="lazy"
            className="aspect-[4/5] w-full max-w-md rounded-card object-cover shadow-xl"
          />
          <motion.div {...rise(0.1)} className="flex flex-col gap-5">
            <h2 className="text-4xl font-semibold">Segurança e privacidade em primeiro lugar</h2>
            <ul className="flex flex-col gap-4 text-lg">
              {safety.map((item) => (
                <li key={item} className="flex gap-3">
                  <ShieldCheck className="mt-1 size-6 shrink-0 text-leaf-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <section className="bg-ink py-20 text-canvas">
          <motion.div
            {...rise()}
            className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 text-center"
          >
            <ShoppingBag className="size-12 text-brand-400" aria-hidden />
            <h2 className="text-4xl font-semibold">Tem uma empresa pet?</h2>
            <p className="text-lg opacity-80">
              Anuncie rações, acessórios, medicamentos e serviços para uma comunidade apaixonada por
              animais.
            </p>
            <Link
              to="/cadastro"
              className="rounded-full bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-600"
            >
              Cadastrar minha empresa
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-line px-5 py-8 text-center text-sm text-muted">
        <p>
          TinPet · Projeto open source (MIT) ·{' '}
          <Link to="/termos" className="underline">
            Termos e privacidade
          </Link>
        </p>
        <p>
          Versão de demonstração: perfis e publicações de exemplo usam fotos de banco de imagens
          livres (CC0) e nomes fictícios.
        </p>
      </footer>
    </div>
  )
}
