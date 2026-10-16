import { createElement, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '/src/api/queryClient.ts'
import { useSession, useProfile, useUpdateProfile, useLogin } from '/src/api/hooks/useAuth.ts'
import { useOrder } from '/src/api/hooks/useOrders.ts'
import { useWallets } from '/src/api/hooks/useWallets.ts'
import { useCart, useAddCartItem } from '/src/api/hooks/useCart.ts'
import { useFavorites, useSetFavorite } from '/src/api/hooks/useFavorites.ts'

// Exercise the real hooks with the application's QueryClient, without replacing
// services, HTTP responses, authentication callbacks or the production tree.
export function mountPrivateCacheProbe(orderId = 'missing-probe-order') {
  const host = document.createElement('div')
  document.body.append(host)
  function Probe() {
    const session = useSession()
    const profile = useProfile()
    const wallets = useWallets()
    const order = useOrder(orderId)
    const cart = useCart()
    const favorites = useFavorites()
    const login = useLogin()
    const updateProfile = useUpdateProfile()
    const addCartItem = useAddCartItem()
    const setFavorite = useSetFavorite()
    useLayoutEffect(() => {
      window.__privateProbe = {
        userId: session.data?.user.id ?? null,
        profile: profile.data, wallets: wallets.data,
        order: order.data, cart: cart.data, favorites: favorites.data,
        login, updateProfile, addCartItem, setFavorite,
        queries: { profile, wallets, order },
      }
    })
    return null
  }
  const root = createRoot(host)
  root.render(createElement(QueryClientProvider, { client: queryClient }, createElement(Probe)))
  return () => { root.unmount(); host.remove() }
}
