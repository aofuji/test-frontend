import type { MockScenario } from './nft'

export type CartScenario =
  | MockScenario
  | 'quantity-exceeded'
  | 'sold-out'
  | 'invalid-coupon'
  | 'expired-coupon'
  | 'price-change'
  | 'network-error'

export type CartItem = {
  id: string
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  creator: string
  collection: string
  chain: string
  quantity: number
  unitPriceEth: string
  available: boolean
  maxQuantity: number
}

export type CartTotals = {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
}

export type AppliedCoupon = {
  code: string
  label: string
  discountEth: string
}

export type Cart = {
  id: string
  ownerType: 'guest' | 'user'
  items: CartItem[]
  coupon: AppliedCoupon | null
  totals: CartTotals
  updatedAt: string
}

export type AddCartItemRequest = {
  nftId: string
  editionId: string
  quantity: number
  scenario?: CartScenario
}

export type UpdateCartItemRequest = {
  quantity?: number
  couponCode?: string | null
  scenario?: CartScenario
}

export type CartResponse = {
  cart: Cart
}

export type QuoteRequest = {
  couponCode?: string | null
  scenario?: CartScenario
}

export type Quote = {
  id: string
  cart: Cart
  expiresAt: string
}

export type QuoteResponse = {
  quote: Quote
}

export type CartErrorCode =
  | 'CART_VALIDATION_ERROR'
  | 'NFT_NOT_FOUND'
  | 'EDITION_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'QUANTITY_EXCEEDED'
  | 'NFT_SOLD_OUT'
  | 'INVALID_COUPON'
  | 'EXPIRED_COUPON'
  | 'QUOTE_UNAVAILABLE'

export type CartErrorResponse = {
  code: CartErrorCode
  message: string
  fieldErrors?: Partial<Record<keyof AddCartItemRequest | keyof UpdateCartItemRequest, string>>
}
