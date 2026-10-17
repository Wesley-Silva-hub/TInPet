import type { Role } from '@tinpet/shared'
import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '../components/ui/States'
import { homePathFor, useAuth } from '../lib/auth'

/** Exige sessão; opcionalmente restringe por papel. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingState />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}

/** Páginas públicas de entrada: quem já está logado vai direto para o app. */
export function RedirectIfAuthenticated() {
  const { status, user } = useAuth()
  if (status === 'loading') return <LoadingState />
  if (user) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}
