import { fireEvent, render, screen } from '@testing-library/react'
import type { FeedItem } from '@tinpet/shared'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { petAge, SwipeCard } from './SwipeCard'

const item: FeedItem = {
  pet: {
    id: '11111111-1111-4111-8111-111111111111',
    ownerId: '22222222-2222-4222-8222-222222222222',
    name: 'Luna',
    species: 'DOG',
    breed: 'Labrador',
    breedId: 1,
    sex: 'FEMALE',
    size: 'LARGE',
    birthDate: null,
    bio: 'Companheira de corrida',
    purpose: 'BOTH',
    isActive: true,
    photos: [],
    vaccineStatus: 'UP_TO_DATE',
    activeAlertId: null,
  },
  owner: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Bruno Lima',
    age: 36,
    bio: '',
    avatarUrl: null,
    city: 'São Paulo',
    state: 'SP',
    maritalStatus: null,
    profession: null,
  },
  distanceKm: 4,
  affinity: { score: 87, reasons: ['Mesmo porte', 'Bem pertinho'] },
}

function renderCard(onSwipe = vi.fn()) {
  render(
    <MemoryRouter>
      <SwipeCard item={item} leaving={null} onSwipe={onSwipe} />
    </MemoryRouter>,
  )
  return onSwipe
}

describe('SwipeCard', () => {
  it('mostra a distância aproximada e o tutor', () => {
    renderCard()
    expect(screen.getByRole('heading', { name: /Luna/ })).toBeInTheDocument()
    expect(screen.getByText('a 4 km')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bruno, 36/ })).toHaveAttribute(
      'href',
      '/usuarios/22222222-2222-4222-8222-222222222222',
    )
  })

  it('arrastar para a direita além do limite curte; arrasto curto volta ao lugar', () => {
    vi.useFakeTimers()
    const onSwipe = renderCard()
    const card = screen.getByRole('article')
    card.setPointerCapture = () => {}

    fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(card, { clientX: 150, pointerId: 1 })
    fireEvent.pointerUp(card, { clientX: 150, pointerId: 1 })
    vi.runAllTimers()
    expect(onSwipe).not.toHaveBeenCalled()

    fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(card, { clientX: 300, pointerId: 1 })
    fireEvent.pointerUp(card, { clientX: 300, pointerId: 1 })
    vi.runAllTimers()
    expect(onSwipe).toHaveBeenCalledWith('LIKE')
    vi.useRealTimers()
  })
})

describe('petAge', () => {
  it('usa meses para filhotes e anos para adultos', () => {
    const monthsAgo = (n: number) =>
      new Date(Date.now() - n * 30.5 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    expect(petAge(monthsAgo(5))).toBe('5 meses')
    expect(petAge(monthsAgo(30))).toBe('2 anos')
    expect(petAge(null)).toBeNull()
  })
})
