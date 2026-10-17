import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../lib/auth'
import { RegisterPage } from './RegisterPage'

function renderPage() {
  // Sem sessão: o refresh inicial responde 401
  const fetchMock = vi.fn(async (_url: RequestInfo | URL) => new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('cadastro', () => {
  it('exige aceite dos termos e valida campos antes de chamar a API', async () => {
    const fetchMock = renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('É preciso aceitar os termos de uso')).toBeInTheDocument()
    expect(screen.getByLabelText('Seu nome')).toHaveAttribute('aria-invalid', 'true')
    const registerCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/auth/register'),
    )
    expect(registerCalls).toHaveLength(0)
  })

  it('mostra os campos da empresa só para o papel empresa', async () => {
    renderPage()
    expect(screen.queryByLabelText('CNPJ')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Empresa'))
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument()
    expect(screen.queryByText(/localização aproximada/)).not.toBeInTheDocument()
  })
})
