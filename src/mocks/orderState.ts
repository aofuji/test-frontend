import Decimal from 'decimal.js'

import type { Cart, CartItem } from '@/api/types/cart'
import type {
  CreateOrderRequest,
  Order,
  OrderErrorResponse,
  OrderItemSnapshot,
} from '@/api/types/order'
import {
  getCart,
  getOwnerKey,
  getStoredQuote,
  removePurchasedCartItems,
} from './cartState'
import { getWallet } from './walletState'

const orderStateKey = 'nft-marketplace.order-state.v1'

type IdempotencyRecord = {
  fingerprint: string
  orderId: string
  cartApplied: boolean
}

type PersistedOrderState = {
  ordersByUser: Record<string, Order[]>
  idempotencyByUser: Record<string, Record<string, IdempotencyRecord>>
}

type OrderResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: OrderErrorResponse }

export function resetOrderState() {
  localStorage.removeItem(orderStateKey)
}

export function getOrder(userId: string | null, orderId: string): OrderResult<Order> {
  if (!userId) {
    return unauthenticated()
  }

  const state = readState()
  const order = state.ordersByUser[userId]?.find(
    (candidate) => candidate.id === orderId,
  )

  if (!order) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido nao encontrado.',
      },
    }
  }

  return { ok: true, data: order }
}

export function createOrder(
  userId: string | null,
  payload: CreateOrderRequest,
): OrderResult<Order> {
  if (!userId || payload.scenario === 'session-expired') {
    return unauthenticated()
  }

  if (payload.scenario === 'error') {
    return serverError()
  }

  const validation = validateOrderPayload(payload)

  if (validation) {
    return validation
  }

  const state = readState()
  const idempotencyRecords = getIdempotencyRecords(state, userId)
  const fingerprint = getPayloadFingerprint(payload)
  const existingRecord = idempotencyRecords[payload.idempotencyKey]

  if (existingRecord) {
    if (existingRecord.fingerprint !== fingerprint) {
      return {
        ok: false,
        status: 409,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Esta chave de idempotencia ja foi usada em outra tentativa.',
        },
      }
    }

    const existingOrder = state.ordersByUser[userId]?.find(
      (order) => order.id === existingRecord.orderId,
    )

    if (existingOrder) {
      return { ok: true, data: existingOrder }
    }
  }

  const ownerKey = getOwnerKey(userId)
  const quote = getStoredQuote(ownerKey, payload.quoteId)

  if (!quote) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'QUOTE_NOT_FOUND',
        message: 'Cotacao nao encontrada. Atualize a revisao do pedido.',
      },
    }
  }

  if (payload.scenario === 'quote-expired' || Date.now() >= Date.parse(quote.expiresAt)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'QUOTE_EXPIRED',
        message: 'A cotacao expirou. Gere uma nova cotacao para continuar.',
      },
    }
  }

  const currentCart = getCart(
    ownerKey,
    payload.scenario === 'price-change' ? 'price-change' : undefined,
  )

  if (!currentCart.ok) {
    return {
      ok: false,
      status: currentCart.status,
      error: {
        code: 'ORDER_SERVICE_UNAVAILABLE',
        message: currentCart.error.message,
      },
    }
  }

  if (payload.scenario === 'sold-out' || currentCart.data.items.some((item) => !item.available)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'NFT_SOLD_OUT',
        message: 'Um ou mais NFTs ficaram indisponiveis.',
      },
    }
  }

  if (hasQuoteChanged(quote.cart, currentCart.data)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'QUOTE_CHANGED',
        message: 'Preco, disponibilidade ou cupom mudaram. Revise uma nova cotacao.',
      },
    }
  }

  const wallet = getWallet(userId, payload.walletId)

  if (!wallet) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'ORDER_VALIDATION_ERROR',
        message: 'Selecione uma carteira valida.',
        fieldErrors: { walletId: 'Carteira nao encontrada.' },
      },
    }
  }

  const now = new Date().toISOString()
  const status = payload.scenario === 'declined' ? 'declined' : 'confirmed'
  const order: Order = {
    id: `order-${crypto.randomUUID()}`,
    status,
    transactionId:
      status === 'confirmed' ? `tx-${crypto.randomUUID().slice(0, 12)}` : null,
    quoteId: quote.id,
    wallet: structuredClone(wallet),
    network: payload.network,
    items: quote.cart.items.map(toOrderItemSnapshot),
    coupon: quote.cart.coupon ? { ...quote.cart.coupon } : null,
    totals: { ...quote.cart.totals },
    createdAt: now,
    updatedAt: now,
    failureReason:
      status === 'declined'
        ? 'Pagamento recusado pelo provedor simulado.'
        : undefined,
  }

  state.ordersByUser[userId] ??= []
  state.ordersByUser[userId].push(order)
  idempotencyRecords[payload.idempotencyKey] = {
    fingerprint,
    orderId: order.id,
    cartApplied: false,
  }
  writeState(state)

  if (order.status === 'confirmed') {
    removePurchasedCartItems(ownerKey, order.items)
    markCartApplied(userId, payload.idempotencyKey)
  }

  return { ok: true, data: order }
}

function markCartApplied(userId: string, idempotencyKey: string) {
  const state = readState()
  const record = state.idempotencyByUser[userId]?.[idempotencyKey]

  if (!record || record.cartApplied) {
    return
  }

  record.cartApplied = true
  writeState(state)
}

function toOrderItemSnapshot(item: CartItem): OrderItemSnapshot {
  return {
    ...item,
    lineTotalEth: new Decimal(item.unitPriceEth)
      .times(item.quantity)
      .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
      .toFixed(),
  }
}

function hasQuoteChanged(quoteCart: Cart, currentCart: Cart) {
  const quoteEssentials = {
    coupon: quoteCart.coupon,
    totals: quoteCart.totals,
    items: quoteCart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      available: item.available,
    })),
  }
  const currentEssentials = {
    coupon: currentCart.coupon,
    totals: currentCart.totals,
    items: currentCart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      available: item.available,
    })),
  }

  return JSON.stringify(quoteEssentials) !== JSON.stringify(currentEssentials)
}

function getIdempotencyRecords(state: PersistedOrderState, userId: string) {
  state.idempotencyByUser[userId] ??= {}
  return state.idempotencyByUser[userId]
}

function getPayloadFingerprint(payload: CreateOrderRequest) {
  return JSON.stringify({
    quoteId: payload.quoteId,
    walletId: payload.walletId,
    network: payload.network,
  })
}

function validateOrderPayload(payload: CreateOrderRequest): OrderResult<never> | null {
  const fieldErrors: Record<string, string> = {}

  if (!payload.quoteId) {
    fieldErrors.quoteId = 'Gere uma cotacao antes de confirmar.'
  }

  if (!payload.walletId) {
    fieldErrors.walletId = 'Selecione uma carteira.'
  }

  if (!payload.network) {
    fieldErrors.network = 'Selecione a rede.'
  }

  if (!payload.idempotencyKey) {
    fieldErrors.idempotencyKey = 'Chave de idempotencia ausente.'
  }

  if (Object.keys(fieldErrors).length === 0) {
    return null
  }

  return {
    ok: false,
    status: 400,
    error: {
      code: 'ORDER_VALIDATION_ERROR',
      message: 'Confira os dados do pedido.',
      fieldErrors,
    },
  }
}

function readState(): PersistedOrderState {
  const raw = localStorage.getItem(orderStateKey)

  if (!raw) {
    return { ordersByUser: {}, idempotencyByUser: {} }
  }

  try {
    return JSON.parse(raw) as PersistedOrderState
  } catch {
    resetOrderState()
    return { ordersByUser: {}, idempotencyByUser: {} }
  }
}

function writeState(state: PersistedOrderState) {
  localStorage.setItem(orderStateKey, JSON.stringify(state))
}

function unauthenticated(): OrderResult<never> {
  return {
    ok: false,
    status: 401,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Sessao expirada. Faca login novamente para concluir a compra.',
    },
  }
}

function serverError(): OrderResult<never> {
  return {
    ok: false,
    status: 500,
    error: {
      code: 'ORDER_SERVICE_UNAVAILABLE',
      message: 'Erro simulado ao criar o pedido.',
    },
  }
}
