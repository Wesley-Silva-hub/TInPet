import { Heart, MessageCircle, Settings, ShoppingBag, Store, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '../components/Logo'
import { useMe } from '../lib/auth'
import { useRealtime } from './useRealtime'

const ownerNav = [
  { to: '/feed', label: 'Descobrir', icon: Heart },
  { to: '/matches', label: 'Matches', icon: MessageCircle },
  { to: '/loja', label: 'Loja', icon: ShoppingBag },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

const companyNav = [
  { to: '/empresa', label: 'Meus produtos', icon: Store },
  { to: '/loja', label: 'Vitrine', icon: ShoppingBag },
  { to: '/configuracoes', label: 'Conta', icon: Settings },
]

/** Casca do app logado: cabeçalho no desktop, barra inferior no celular. */
export function AppLayout() {
  const user = useMe()
  useRealtime(user.role === 'OWNER')
  const nav = user.role === 'COMPANY' ? companyNav : ownerNav

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs font-semibold transition sm:flex-row sm:gap-2 sm:text-sm ${
      isActive ? 'text-brand-600 sm:bg-brand-100 dark:sm:bg-surface-2' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" aria-label="TinPet, início">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden gap-1 sm:flex">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-5xl px-4 pt-6">
        <Outlet />
      </main>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto flex max-w-md justify-around py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="size-6" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
