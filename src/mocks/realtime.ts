import { ws } from 'msw'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/types/realtime'
import { getCurrentUserId } from './authState'

// MSW intercepts this same-origin endpoint in the page; no listening server exists.
const browserLocation = typeof location === 'undefined' ? new URL('http://localhost') : location
const protocol = browserLocation.protocol === 'https:' ? 'wss:' : 'ws:'
// MSW normalizes Socket.IO's /socket.io/ transport path to / for matching.
const channel = ws.link(`${protocol}//${browserLocation.host}/`)
type Client = typeof channel.clients extends Set<infer T> ? T : never
const connected = new Map<Client, string | null>()
let disconnected = false

export const realtimeHandler = channel.addEventListener('connection', ({ client }) => {
  if (disconnected) { client.close(); return }
  client.send(`0${JSON.stringify({ sid: crypto.randomUUID(), upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 })}`)
  const heartbeat = setInterval(() => client.send('2'), 25000)
  client.addEventListener('message', (event) => {
    const frame = String(event.data)
    if (frame === '40') {
      connected.set(client, getCurrentUserId())
      client.send(`40${JSON.stringify({ sid: crypto.randomUUID() })}`)
    } else if (frame === '3') {
      // Client responded to an Engine.IO heartbeat.
    } else if (frame === '41') {
      connected.delete(client)
      client.close()
    }
  })
  client.addEventListener('close', () => { clearInterval(heartbeat); connected.delete(client) })
})

function emit(event: string, payload: NftUpdatedEvent | OrderUpdatedEvent) {
  if (disconnected) return
  for (const [client, userId] of connected) {
    if (event === 'order.updated' && userId !== (payload as OrderUpdatedEvent).userId) continue
    client.send(`42${JSON.stringify([event, payload])}`)
  }
}

export function emitNftUpdated(payload: NftUpdatedEvent) { emit('nft.updated', payload) }
export function emitOrderUpdated(payload: OrderUpdatedEvent) { emit('order.updated', payload) }

export function setRealtimeDisconnected(value: boolean) {
  disconnected = value
  if (value) {
    for (const client of connected.keys()) client.close()
    connected.clear()
  }
}

export function resetRealtime() {
  setRealtimeDisconnected(true)
  setRealtimeDisconnected(false)
}
