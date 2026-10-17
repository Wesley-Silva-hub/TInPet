import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Post } from '@tinpet/shared'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PostCard } from './PostCard'

const post: Post = {
  id: '11111111-1111-4111-8111-111111111111',
  author: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Rafael Moreira',
    avatarUrl: null,
    city: 'São Paulo',
  },
  pet: { id: '33333333-3333-4333-8333-333333333333', name: 'Bento', species: 'DOG' },
  imageUrl: '/foto.webp',
  caption: 'Home office com supervisão integral',
  createdAt: new Date().toISOString(),
  likeCount: 12,
  commentCount: 3,
  likedByMe: false,
  mine: false,
  recentComments: [],
}

function renderCard() {
  const fetchMock = vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ likeCount: 13, likedByMe: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PostCard post={post} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('PostCard', () => {
  it('mostra autor, pet, legenda e contadores', () => {
    renderCard()
    expect(screen.getAllByText('Rafael Moreira')[0]).toBeInTheDocument()
    expect(screen.getByText('Bento')).toBeInTheDocument()
    expect(screen.getByText('12 curtidas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todos os 3 comentários' })).toBeInTheDocument()
  })

  it('duplo toque na foto curte (PUT) e a interface atualiza na hora', async () => {
    const fetchMock = renderCard()
    const photo = screen.getByRole('button', { name: /Toque duas vezes para curtir/ })
    await act(async () => {
      fireEvent.click(photo)
      fireEvent.click(photo)
    })
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/like'))
    expect(call?.[1]?.method).toBe('PUT')
    expect(String(call?.[0])).toContain(`/posts/${post.id}/like`)
  })

  it('o botão de curtir indica o estado para leitores de tela', () => {
    renderCard()
    expect(screen.getByRole('button', { name: 'Curtir' })).toHaveAttribute('aria-pressed', 'false')
  })
})
