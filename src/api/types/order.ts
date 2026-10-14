import type { AppliedCoupon, CartItem, CartTotals } from './cart'
import type { Wallet, WalletNetwork } from './wallet'

export type PaymentStatus = 'pending' | 'confirmed' | 'declined'

export type OrderScenario =
  | 'pending'
  | 'pending-manual'
  | 'confirmed'
  | 'declined'
  | 'timeout-before-create'
  | 'timeout-after-create'
  | 'quote-expired'
  | 'price-change'
  | 'sold-out'
  | 'session-expired'
  | 'error'

export type OrderItemSnapshot = CartItem & {
  lineTotalEth: string
}

export type Order = {
  id: string
  version?: number
  status: PaymentStatus
  transactionId: string | null
  quoteId: string
  wallet: Wallet
  network: WalletNetwork
  items: OrderItemSnapshot[]
  coupon: AppliedCoupon | null
  totals: CartTotals
  createdAt: string
  updatedAt: string
  failureReason?: string
}

export type CreateOrderRequest = {
  quoteId: string
  walletId: string
  network: WalletNetwork
  idempotencyKey: string
  scenario?: OrderScenario
}

export type OrderResponse = {
  order: Order
}

export type OrdersResponse = {
  orders: Order[]
}

export type OrderErrorCode =
  | 'ORDER_VALIDATION_ERROR'
  | 'ORDER_NOT_FOUND'
  | 'QUOTE_NOT_FOUND'
  | 'QUOTE_EXPIRED'
  | 'QUOTE_CHANGED'
  | 'NFT_SOLD_OUT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_DECLINED'
  | 'UNAUTHENTICATED'
  | 'ORDER_SERVICE_UNAVAILABLE'

export type OrderErrorResponse = {
  code: OrderErrorCode
  message: string
  fieldErrors?: Partial<Record<keyof CreateOrderRequest, string>>
}
