import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCartItem,
  applyCartCoupon,
  createQuote,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../cart'
import { queryKeys } from '../queryKeys'
import type {
  AddCartItemRequest,
  Cart,
  QuoteRequest,
  UpdateCartItemRequest,
} from '../types/cart'

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: ({ signal }) => getCart(signal),
  })
}

export function useAddCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddCartItemRequest) => addCartItem(payload),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.current(), cart)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string
      payload: UpdateCartItemRequest
    }) => updateCartItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.current() })
      const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart.current())

      if (previousCart && typeof payload.quantity === 'number') {
        const quantity = payload.quantity
        queryClient.setQueryData<Cart>(queryKeys.cart.current(), {
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
        queryClient.setQueryData(queryKeys.cart.current(), context.previousCart)
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.current(), cart)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.current() })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.current(), cart)
    },
  })
}

export function useApplyCartCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCartItemRequest) => applyCartCoupon(payload),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.current(), cart)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.current() })
    },
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: QuoteRequest) => createQuote(payload),
    onSuccess: (quote) => {
      queryClient.setQueryData(queryKeys.cart.current(), quote.cart)
    },
  })
}
