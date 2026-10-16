import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createOrder, getOrder, getOrders } from '../orders'
import { queryKeys } from '../queryKeys'
import type { CreateOrderRequest } from '../types/order'
import { useSession } from './useAuth'
import { usePrivateMutation } from './usePrivateMutation'

export function useOrder(orderId: string) {
  const queryClient = useQueryClient()
  const userId = useSession().data?.user.id
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId, userId),
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId, signal)
      if (order.status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
      }
      return order
    },
    retry: false,
    enabled: Boolean(userId),
  })
}

export function useOrders() {
  const userId = useSession().data?.user.id
  return useQuery({
    queryKey: queryKeys.orders.list(userId),
    queryFn: ({ signal }) => getOrders(signal),
    retry: false,
    enabled: Boolean(userId),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const userId = useSession().data?.user.id

  return usePrivateMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id, userId), order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    },
  })
}
