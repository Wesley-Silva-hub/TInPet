import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../lib/auth'
import { LoginPage } from './LoginPage'

const me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@teste.dev',
  name: 'Ana',
  role: 'OWNER',
  twoFactorEnabled: true,
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function renderPage(responses: Record<string, Response>) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url)
    const key = Object.keys(responses).find((candidate) => path.endsWith(candidate))
    return key ? (responses[key] as Response).clone() : new Response(null, { status: 401 })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/entrar']}>
          <Routes>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/inicio" element={<p>Início do app</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('login com verificação em duas etapas', () => {
  it('pede o código do app e entra depois de confirmar', async () => {
    const fetchMock = renderPage({
      '/auth/login': json(200, { mfaRequired: true, mfaToken: 'token-da-segunda-etapa' }),
      '/auth/login/2fa': json(200, { accessToken: 'access', user: me }),
    })
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@teste.dev')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura-123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Verificação em duas etapas')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Código do app'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Início do app')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/login/2fa'))
    const init = (call as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toEqual({
      mfaToken: 'token-da-segunda-etapa',
      code: '123456',
    })
  })

  it('código errado mostra o erro e continua na etapa do código', async () => {
    renderPage({
      '/auth/login': json(200, { mfaRequired: true, mfaToken: 'token' }),
      '/auth/login/2fa': json(401, {
        error: { code: 'INVALID_CODE', message: 'Código inválido ou já usado' },
      }),
    })
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@teste.dev')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura-123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await userEvent.type(await screen.findByLabelText('Código do app'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Código inválido ou já usado')).toBeInTheDocument()
  })
})
