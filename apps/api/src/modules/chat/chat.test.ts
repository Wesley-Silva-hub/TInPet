import type { Message, Page, SwipeResult } from '@tinpet/shared'
import { io } from 'socket.io-client'
import { describe, expect, it } from 'vitest'
import { auth, createPet, registerOwner, setupTestApp } from '../../test/helpers'

const ctx = setupTestApp()

async function matchedPair() {
  const ana = await registerOwner(ctx.app)
  const bruno = await registerOwner(ctx.app)
  const intruder = await registerOwner(ctx.app)
  const thor = await createPet(ctx.app, ana.token)
  const luna = await createPet(ctx.app, bruno.token)
  const like = (token: string, fromPetId: string, toPetId: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/v1/swipes',
      headers: auth(token),
      payload: { fromPetId, toPetId, direction: 'LIKE' },
    })
  await like(ana.token, thor.id, luna.id)
  const match = (await like(bruno.token, luna.id, thor.id)).json<SwipeResult>().match
  return { ana, bruno, intruder, matchId: match?.id as string }
}

const send = (token: string, matchId: string, content: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/matches/${matchId}/messages`,
    headers: auth(token),
    payload: { content },
  })

describe('chat', () => {
  it('só participantes do match leem e enviam mensagens', async () => {
    const { ana, intruder, matchId } = await matchedPair()
    expect((await send(ana.token, matchId, 'Oi!')).statusCode).toBe(201)
    expect((await send(intruder.token, matchId, 'Oi?')).statusCode).toBe(404)
    const read = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/matches/${matchId}/messages`,
      headers: auth(intruder.token),
    })
    expect(read.statusCode).toBe(404)
  })

  it('pagina o histórico do mais recente para o mais antigo e marca como lido', async () => {
    const { ana, bruno, matchId } = await matchedPair()
    for (const content of ['1', '2', '3']) await send(ana.token, matchId, content)

    const first = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/matches/${matchId}/messages?limit=2`,
      headers: auth(bruno.token),
    })
    const page = first.json<Page<Message>>()
    expect(page.items.map((m) => m.content)).toEqual(['3', '2'])
    const second = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/matches/${matchId}/messages?limit=2&cursor=${page.nextCursor}`,
      headers: auth(bruno.token),
    })
    expect(second.json<Page<Message>>().items.map((m) => m.content)).toEqual(['1'])

    const matchesBefore = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/matches',
      headers: auth(bruno.token),
    })
    expect(matchesBefore.json()[0].unreadCount).toBe(3)
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/matches/${matchId}/read`,
      headers: auth(bruno.token),
    })
    const matchesAfter = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/matches',
      headers: auth(bruno.token),
    })
    expect(matchesAfter.json()[0].unreadCount).toBe(0)
  })

  it('entrega mensagens em tempo real e recusa socket sem token', async () => {
    const { ana, bruno, matchId } = await matchedPair()
    const address = await ctx.app.listen({ port: 0, host: '127.0.0.1' })
    const options = { path: '/api/socket.io', transports: ['websocket'] }

    const anonymous = io(address, options)
    const refused = await new Promise<string>((resolve) =>
      anonymous.on('connect_error', (error) => resolve(error.message)),
    )
    expect(refused).toBe('UNAUTHORIZED')
    anonymous.close()

    const brunoSocket = io(address, { ...options, auth: { token: bruno.token } })
    const anaSocket = io(address, { ...options, auth: { token: ana.token } })
    await Promise.all(
      [brunoSocket, anaSocket].map(
        (s) => new Promise((resolve) => s.on('connect', () => resolve(null))),
      ),
    )
    const received = new Promise<Message>((resolve) => brunoSocket.on('message:new', resolve))
    const ack = await anaSocket.emitWithAck('message:send', { matchId, content: 'Tempo real!' })
    expect(ack.ok).toBe(true)
    expect((await received).content).toBe('Tempo real!')

    const forbidden = await brunoSocket.emitWithAck('message:send', {
      matchId: '00000000-0000-4000-8000-000000000000',
      content: 'x',
    })
    expect(forbidden.ok).toBe(false)
    brunoSocket.close()
    anaSocket.close()
  })
})
