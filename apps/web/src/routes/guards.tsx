import type { Role } from '@tinpet/shared'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '../components/ui/States'
import { homePathFor, useAuth } from '../lib/auth'

/** Depois desse tempo a demora é quase sempre a API do plano grátis acordando. */
export const SLOW_SESSION_MS = 4_000

/** Espera a sessão ser restaurada e explica a demora quando o servidor está acordando. */
export function SessionLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_SESSION_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <LoadingState
        label={
          slow
            ? 'Acordando o servidor… Na primeira visita depois de um tempo parado isso pode levar até 1 minuto.'
            : 'Carregando…'
        }
      />
    </div>
  )
}

/** Exige sessão; opcionalmente restringe por papel. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionLoading />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}

/** Páginas públicas de entrada: quem já está logado vai direto para o app. */
export function RedirectIfAuthenticated() {
  const { status, user } = useAuth()
  if (status === 'loading') return <SessionLoading />
  if (user) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}
