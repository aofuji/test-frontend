import { apiClient } from './http/client'
import type { CreateOrderRequest, OrderResponse, OrdersResponse } from './types/order'

export async function createOrder(payload: CreateOrderRequest) {
  const response = await apiClient.post<OrderResponse>('/orders', payload)

  return response.data.order
}

export async function getOrders(signal?: AbortSignal) {
  const response = await apiClient.get<OrdersResponse>('/orders', { signal })

  return response.data.orders
}

export async function getOrder(orderId: string, signal?: AbortSignal) {
  const response = await apiClient.get<OrderResponse>(`/orders/${orderId}`, {
    signal,
  })

  return response.data.order
}
