import type { Notification } from '@tinpet/shared'
import { describe, expect, it } from 'vitest'
import { describeNotification } from './describe'

const base: Notification = {
  id: '00000000-0000-4000-8000-000000000001',
  type: 'LOST_PET_NEARBY',
  actor: { id: '00000000-0000-4000-8000-000000000002', name: 'Camila Rocha', avatarUrl: null },
  postId: null,
  postImageUrl: null,
  matchId: null,
  petId: null,
  eventId: null,
  alertId: '00000000-0000-4000-8000-000000000003',
  petName: 'Mel',
  petPhotoUrl: null,
  preview: 'Mel sumiu perto de Ininga',
  read: false,
  createdAt: '2026-10-17T12:00:00Z',
}

describe('avisos de pet perdido', () => {
  it('alerta de vizinho leva para o alerta', () => {
    expect(describeNotification(base)).toEqual({
      text: '🚨 Pet perdido perto de você: Mel sumiu perto de Ininga. Fique de olho!',
      to: `/perdidos/${base.alertId}`,
    })
  })

  it('recado pela plaquinha, sem alerta aberto, leva ao perfil do pet', () => {
    const notification: Notification = {
      ...base,
      type: 'LOST_PET_SIGHTING',
      actor: null,
      alertId: null,
      petId: '00000000-0000-4000-8000-000000000004',
      preview: 'Está comigo',
    }
    expect(describeNotification(notification)).toEqual({
      text: 'Alguém achou Mel pela plaquinha: “Está comigo”',
      to: `/pets/${notification.petId}`,
    })
  })
})

describe('avisos de eventos', () => {
  const event = {
    ...base,
    alertId: null,
    eventId: '00000000-0000-4000-8000-000000000005',
    preview: 'Cãominhada (passeio em grupo) sáb., 21/11 em Parque da Cidadania',
  }

  it('evento perto leva para a página do evento', () => {
    expect(describeNotification({ ...event, type: 'EVENT_NEARBY' })).toEqual({
      text: `📅 Evento perto de você: ${event.preview}`,
      to: `/eventos/${event.eventId}`,
    })
  })

  it('evento cancelado também leva para o evento', () => {
    expect(describeNotification({ ...event, type: 'EVENT_CANCELLED' }).to).toBe(
      `/eventos/${event.eventId}`,
    )
  })
})

describe('lembretes de saúde', () => {
  it('vacina e remédio levam para a ficha do pet', () => {
    const health = { ...base, alertId: null, petId: '00000000-0000-4000-8000-000000000006' }
    const vaccine = describeNotification({
      ...health,
      type: 'VACCINE_DUE',
      preview: 'Antirrábica de Mel vence em 5 dias (19/11/2026)',
    })
    expect(vaccine.to).toBe(`/pets/${health.petId}/editar`)
    expect(vaccine.text).toContain('Antirrábica de Mel vence em 5 dias')
    expect(describeNotification({ ...health, type: 'MEDICATION_TODAY' }).text).toMatch(
      /^💊 Remédio hoje/,
    )
  })
})
