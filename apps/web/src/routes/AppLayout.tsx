import {
  Bell,
  Flame,
  House,
  type LucideIcon,
  MessageCircle,
  Newspaper,
  PlusSquare,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '../components/Logo'
import { useUnreadCount } from '../features/notifications/queries'
import { useMe } from '../lib/auth'
import { useRealtime } from './useRealtime'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Barra inferior do celular (5 atalhos); o desktop mostra também os extras. */
const ownerTabs: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/feed', label: 'Descobrir', icon: Flame },
  { to: '/publicar', label: 'Publicar', icon: PlusSquare },
  { to: '/matches', label: 'Matches', icon: MessageCircle },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]
const ownerExtras: NavItem[] = [
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/loja', label: 'Loja', icon: ShoppingBag },
]

const companyTabs: NavItem[] = [
  { to: '/empresa', label: 'Meus produtos', icon: Store },
  { to: '/loja', label: 'Vitrine', icon: ShoppingBag },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/configuracoes', label: 'Conta', icon: Settings },
]

const iconLinkClass =
  (extra = '') =>
  ({ isActive }: { isActive: boolean }) =>
    `relative rounded-full p-2.5 transition ${extra} ${
      isActive ? 'bg-brand-100 text-brand-700' : 'text-ink hover:bg-surface-2'
    }`

/** Sininho com contador de não lidas, atualizado em tempo real pelo socket. */
function NotificationBell() {
  const unread = useUnreadCount().data?.unread ?? 0
  const label = unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'
  return (
    <NavLink to="/notificacoes" aria-label={label} className={iconLinkClass()}>
      <Bell className="size-6" aria-hidden />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  )
}

/** Casca do app logado: cabeçalho no topo, barra inferior no celular e transição entre telas. */
export function AppLayout() {
  const user = useMe()
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  useRealtime(user.role === 'OWNER')
  const isOwner = user.role === 'OWNER'
  const tabs = isOwner ? ownerTabs : companyTabs
  const desktopNav = isOwner ? [...ownerTabs, ...ownerExtras] : companyTabs

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition ${
      isActive ? 'text-brand-600' : 'text-muted hover:text-ink'
    }`
  const desktopClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-brand-100 text-brand-700 dark:bg-surface-2 dark:text-brand-400'
        : 'text-muted hover:text-ink'
    }`

  return (
    <div className="min-h-dvh pb-24 lg:pb-8">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="TinPet, início">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden gap-1 lg:flex">
            {desktopNav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={desktopClass}>
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          {isOwner && (
            <nav aria-label="Atalhos" className="flex items-center gap-1">
              {ownerExtras.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} aria-label={label} className={iconLinkClass('lg:hidden')}>
                  <Icon className="size-6" aria-hidden />
                </NavLink>
              ))}
              <NotificationBell />
            </nav>
          )}
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-6">
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-md justify-around py-1.5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={tabClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute -top-1.5 h-1 w-8 rounded-full bg-brand-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className={`size-6 ${isActive ? 'stroke-[2.4]' : ''}`} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
