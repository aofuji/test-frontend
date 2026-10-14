import { apiClient } from './http/client'
import type {
  AddCartItemRequest,
  CartResponse,
  CartScenario,
  QuoteRequest,
  QuoteResponse,
  UpdateCartItemRequest,
} from './types/cart'

export async function getCart(signal?: AbortSignal) {
  const response = await apiClient.get<CartResponse>('/cart', { signal })

  return response.data.cart
}

export async function addCartItem(payload: AddCartItemRequest) {
  const response = await apiClient.post<CartResponse>('/cart/items', payload)

  return response.data.cart
}

export async function updateCartItem(
  itemId: string,
  payload: UpdateCartItemRequest,
) {
  const response = await apiClient.patch<CartResponse>(
    `/cart/items/${itemId}`,
    payload,
  )

  return response.data.cart
}

export async function applyCartCoupon(payload: UpdateCartItemRequest) {
  const response = await apiClient.patch<CartResponse>('/cart/items', payload)

  return response.data.cart
}

export async function removeCartItem(itemId: string, scenario?: CartScenario) {
  const response = await apiClient.delete<CartResponse>(`/cart/items/${itemId}`, {
    params: { scenario },
  })

  return response.data.cart
}

export async function createQuote(payload: QuoteRequest) {
  const response = await apiClient.post<QuoteResponse>('/quotes', payload)

  return response.data.quote
}
