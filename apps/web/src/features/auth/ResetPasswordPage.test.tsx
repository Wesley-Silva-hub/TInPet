import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'

function renderPage(response: Response) {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  render(
    <MemoryRouter initialEntries={['/redefinir-senha/token-de-teste-com-mais-de-20']}>
      <Routes>
        <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
        <Route path="/entrar" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  )
  const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText('Senha nova'), { target: { value: password } })
    fireEvent.change(screen.getByLabelText('Repita a senha'), { target: { value: confirm } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha nova' }))
  }
  return { fetchMock, fill }
}

describe('criar senha nova', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('senhas diferentes não chegam a chamar a API', async () => {
    const { fetchMock, fill } = renderPage(new Response(null, { status: 204 }))
    fill('senha-nova-123', 'senha-outra-123')
    expect(await screen.findByText('As senhas não são iguais')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia o token do link e volta para o login', async () => {
    const { fetchMock, fill } = renderPage(new Response(null, { status: 204 }))
    fill('senha-nova-123', 'senha-nova-123')
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      token: 'token-de-teste-com-mais-de-20',
      password: 'senha-nova-123',
    })
  })

  it('link vencido mostra a mensagem da API no campo', async () => {
    const body = { error: { code: 'INVALID_RESET_TOKEN', message: 'Link inválido ou expirado.' } }
    const { fill } = renderPage(new Response(JSON.stringify(body), { status: 400 }))
    fill('senha-nova-123', 'senha-nova-123')
    await waitFor(() => expect(screen.getByText('Link inválido ou expirado.')).toBeInTheDocument())
  })
})
