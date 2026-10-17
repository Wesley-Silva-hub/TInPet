import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteError } from './RouteError'

vi.mock('../lib/versionReload', async (original) => ({
  ...(await original<typeof import('../lib/versionReload')>()),
  reloadForNewVersion: vi.fn(() => true),
}))

function renderFailingRoute(error: Error) {
  const router = createMemoryRouter([
    {
      path: '/',
      errorElement: <RouteError />,
      loader: () => {
        throw error
      },
      element: <p>nunca aparece</p>,
    },
  ])
  render(<RouterProvider router={router} />)
}

afterEach(() => vi.clearAllMocks())

describe('RouteError', () => {
  it('versão antiga do site: avisa e recarrega sozinho', async () => {
    const { reloadForNewVersion } = await import('../lib/versionReload')
    renderFailingRoute(new TypeError('Failed to fetch dynamically imported module: /assets/a.js'))
    expect(await screen.findByText('Atualizando para a versão mais nova…')).toBeInTheDocument()
    expect(reloadForNewVersion).toHaveBeenCalledTimes(1)
  })

  it('outros erros: mensagem amigável, sem detalhes técnicos, com saídas', async () => {
    const { reloadForNewVersion } = await import('../lib/versionReload')
    renderFailingRoute(new Error('TypeError interno com stack trace'))
    expect(await screen.findByText('Ops! Algo deu errado.')).toBeInTheDocument()
    expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
    expect(reloadForNewVersion).not.toHaveBeenCalled()
  })
})
