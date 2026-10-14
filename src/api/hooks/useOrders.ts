import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createOrder, getOrder, getOrders } from '../orders'
import { queryKeys } from '../queryKeys'
import type { CreateOrderRequest } from '../types/order'

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    retry: false,
  })
}

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: ({ signal }) => getOrders(signal),
    retry: false,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id), order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.current() })
    },
  })
}
