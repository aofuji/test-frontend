import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { queryKeys } from '@/api/queryKeys'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/types/realtime'
import type { Nft, NftListResponse } from '@/api/types/nft'
import type { Order } from '@/api/types/order'

export const nftNoticeEvent = 'nft-marketplace:nft-updated'

export function useRealtime(userId: string | null) {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
    let active = true
    let socket: Socket | undefined
    const versions = new Map<string, number>()
    let hadInterruption = false
    let reconnectWatchdog: ReturnType<typeof setInterval> | undefined

    function ensureReconnect() {
      if (reconnectWatchdog) return
      reconnectWatchdog = setInterval(() => {
        if (active && socket && !socket.connected) {
          // Restart a Manager left in a stale reconnecting state after the mock closes a transport.
          socket.disconnect().connect()
        }
      }, 2500)
    }

    function stopReconnectWatchdog() {
      if (reconnectWatchdog) clearInterval(reconnectWatchdog)
      reconnectWatchdog = undefined
    }

    async function reconcile() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all, refetchType: 'active' }),
        ...(userId ? [queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(), refetchType: 'active' })] : []),
      ])
    }

    async function start() {
      // Socket.IO captures global WebSocket at import time. MSW starts before
      // this hook is mounted, so its interceptor receives the real frames.
      const { io } = await import('socket.io-client')
      if (!active) return
      socket = io(window.location.origin, { path: '/socket.io/', transports: ['websocket'], reconnectionDelay: 300, reconnectionDelayMax: 1500 })
      socket.on('connect', () => {
        if (!active) return
        stopReconnectWatchdog()
        if (hadInterruption) {
          setNotice('Conexao restaurada. Atualizando NFTs, carrinho e pedidos.')
          void reconcile()
        } else {
          setNotice('Atualizacoes em tempo real conectadas.')
        }
        hadInterruption = false
      })
      socket.on('disconnect', () => { if (active) { hadInterruption = true; ensureReconnect(); setNotice('Atualizacoes em tempo real indisponiveis. Reconectando...') } })
      socket.on('connect_error', () => { if (active) { hadInterruption = true; ensureReconnect(); setNotice('Atualizacoes em tempo real indisponiveis. Reconectando...') } })
      socket.on('nft.updated', (event: NftUpdatedEvent) => {
        if (!active || !event || !event.nftId || !Number.isInteger(event.version)) return
        const key = `nft:${event.nftId}`
        if (event.version <= (versions.get(key) ?? 0) || event.version < cachedNftVersion(queryClient, event.nftId)) return
        versions.set(key, event.version)
        void queryClient.cancelQueries({ queryKey: queryKeys.nfts.all }).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all }))
        void queryClient.cancelQueries({ queryKey: queryKeys.cart.all }).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }))
        setNotice(`Preco ou disponibilidade do NFT ${event.nftId} mudou. Revise o carrinho e a cotacao.`)
        window.dispatchEvent(new CustomEvent(nftNoticeEvent, { detail: event }))
      })
      socket.on('order.updated', (event: OrderUpdatedEvent) => {
        if (!active || !userId || event?.userId !== userId || !Number.isInteger(event.version)) return
        const key = `order:${event.orderId}`
        if (event.version <= (versions.get(key) ?? 0) || event.version < cachedOrderVersion(queryClient, event.orderId)) return
        versions.set(key, event.version)
        void queryClient.cancelQueries({ queryKey: queryKeys.orders.all() }).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() }))
        if (event.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
        setNotice(`Pedido ${event.orderId}: ${event.status === 'confirmed' ? 'confirmado' : event.status === 'declined' ? 'recusado' : 'pendente'}.`)
      })
    }

    void start()
    return () => { active = false; stopReconnectWatchdog(); socket?.removeAllListeners(); socket?.disconnect() }
  }, [queryClient, userId])

  return notice
}

function cachedNftVersion(queryClient: QueryClient, nftId: string) {
  let version = 0
  for (const [, data] of queryClient.getQueriesData<Nft | NftListResponse>({ queryKey: queryKeys.nfts.all })) {
    const nfts = data && 'items' in data ? data.items : data ? [data] : []
    for (const nft of nfts) if (nft.id === nftId) version = Math.max(version, nft.version ?? 0)
  }
  return version
}

function cachedOrderVersion(queryClient: QueryClient, orderId: string) {
  let version = 0
  for (const [, data] of queryClient.getQueriesData<Order | Order[]>({ queryKey: queryKeys.orders.all() })) {
    const orders = Array.isArray(data) ? data : data ? [data] : []
    for (const order of orders) if (order.id === orderId) version = Math.max(version, order.version ?? 0)
  }
  return version
}
