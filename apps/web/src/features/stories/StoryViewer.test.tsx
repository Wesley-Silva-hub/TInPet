import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { StoryGroup } from '@tinpet/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoryViewer } from './StoryViewer'

const story = (id: string, caption: string) => ({
  id,
  imageUrl: `/stories/${id}.webp`,
  caption,
  pet: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  seen: false,
  viewCount: null,
})

const groups: StoryGroup[] = [
  {
    author: { id: '11111111-1111-4111-8111-111111111111', name: 'Ana Lima', avatarUrl: null },
    isMine: false,
    allSeen: false,
    items: [
      story('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Primeira foto'),
      story('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Segunda foto'),
    ],
  },
]

function renderViewer(onClose = vi.fn()) {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StoryViewer groups={groups} startGroup={0} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { fetchMock, onClose }
}

describe('visualizador de stories', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('marca cada foto como vista e avança até fechar no fim', () => {
    const { fetchMock, onClose } = renderViewer()
    expect(screen.getByText('Primeira foto')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stories/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/view'),
      expect.objectContaining({ method: 'POST' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    expect(screen.getByText('Segunda foto')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stories/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/view'),
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('fecha com Esc e volta com a seta para a esquerda', () => {
    const { onClose } = renderViewer()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('Segunda foto')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('Primeira foto')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
