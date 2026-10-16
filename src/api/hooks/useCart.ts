import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCartItem,
  applyCartCoupon,
  createQuote,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../cart'
import { queryKeys } from '../queryKeys'
import { useSession } from './useAuth'
import { usePrivateMutation } from './usePrivateMutation'
import type {
  AddCartItemRequest,
  Cart,
  QuoteRequest,
  UpdateCartItemRequest,
} from '../types/cart'

function useCartKey() {
  const session = useSession()
  return queryKeys.cart.current(session.data?.user.id)
}

export function useCart() {
  const session = useSession()
  const cartKey = useCartKey()
  return useQuery({
    queryKey: cartKey,
    queryFn: async ({ signal }) => {
      if (session.isError) await session.refetch({ throwOnError: true })
      return getCart(signal)
    },
    enabled: !session.isPending,
  })
}

export function useAddCartItem() {
  const queryClient = useQueryClient()
  const cartKey = useCartKey()

  return usePrivateMutation({
    mutationKey: queryKeys.cart.all,
    scope: { id: 'cart-session' },
    onMutate: () => queryClient.cancelQueries({ queryKey: cartKey }),
    mutationFn: (payload: AddCartItemRequest) => addCartItem(payload),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey, cart)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const cartKey = useCartKey()

  return usePrivateMutation({
    mutationKey: queryKeys.cart.all,
    scope: { id: 'cart-session' },
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string
      payload: UpdateCartItemRequest
    }) => updateCartItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previousCart = queryClient.getQueryData<Cart>(cartKey)

      if (previousCart && typeof payload.quantity === 'number') {
        const quantity = payload.quantity
        queryClient.setQueryData<Cart>(cartKey, {
          ...previousCart,
          items: previousCart.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item,
          ),
        })
      }

      return { previousCart }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKey, context.previousCart)
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey, cart)
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const cartKey = useCartKey()

  return usePrivateMutation({
    mutationKey: queryKeys.cart.all,
    scope: { id: 'cart-session' },
    onMutate: () => queryClient.cancelQueries({ queryKey: cartKey }),
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey, cart)
    },
  })
}

export function useApplyCartCoupon() {
  const queryClient = useQueryClient()
  const cartKey = useCartKey()

  return usePrivateMutation({
    mutationKey: queryKeys.cart.all,
    scope: { id: 'cart-session' },
    onMutate: () => queryClient.cancelQueries({ queryKey: cartKey }),
    mutationFn: (payload: UpdateCartItemRequest) => applyCartCoupon(payload),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey, cart)
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  const cartKey = useCartKey()

  return usePrivateMutation({
    mutationKey: queryKeys.cart.all,
    scope: { id: 'cart-session' },
    onMutate: () => queryClient.cancelQueries({ queryKey: cartKey }),
    mutationFn: (payload: QuoteRequest) => createQuote(payload),
    onSuccess: (quote) => {
      queryClient.setQueryData(cartKey, quote.cart)
    },
  })
}
