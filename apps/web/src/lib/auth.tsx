import { useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, LoginInput, Me, RegisterInput } from '@tinpet/shared'
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react'
import { api, applySession, hasSessionHint, refreshSession, setSessionListener } from './api'

interface AuthContextValue {
  user: Me | null
  status: 'loading' | 'authenticated' | 'anonymous'
  login(input: LoginInput): Promise<Me>
  register(input: RegisterInput): Promise<Me>
  logout(): Promise<void>
  setUser(user: Me): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<Me | null>(null)
  // Quem nunca entrou neste navegador vê as páginas públicas na hora, sem esperar a API
  const [status, setStatus] = useState<AuthContextValue['status']>(() =>
    hasSessionHint() ? 'loading' : 'anonymous',
  )

  useEffect(() => {
    setSessionListener((session) => {
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'anonymous')
    })
    // Restaura a sessão pelo cookie de refresh; de quebra já acorda a API para o login
    refreshSession()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const start = (session: AuthResponse) => {
      applySession(session)
      return session.user
    }
    return {
      user,
      status,
      login: async (input) =>
        start(await api<AuthResponse>('/auth/login', { method: 'POST', body: input })),
      register: async (input) =>
        start(await api<AuthResponse>('/auth/register', { method: 'POST', body: input })),
      logout: async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
        applySession(null)
        queryClient.clear()
      },
      setUser,
    }
  }, [user, status, queryClient])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

/** Usuário logado (só usar em rotas protegidas). */
export function useMe(): Me {
  const { user } = useAuth()
  if (!user) throw new Error('Rota protegida renderizada sem usuário')
  return user
}

const homePaths: Record<Me['role'], string> = {
  OWNER: '/inicio',
  COMPANY: '/empresa',
  ADMIN: '/moderacao',
}

export function homePathFor(user: Me) {
  return homePaths[user.role]
}
