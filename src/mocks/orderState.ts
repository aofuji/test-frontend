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
import { emitOrderUpdated } from './realtime'

const orderStateKey = 'nft-marketplace.order-state.v1'
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

type IdempotencyRecord = {
  fingerprint: string
  orderId: string
  cartApplied: boolean
}

type PersistedOrderState = {
  ordersByUser: Record<string, Order[]>
  idempotencyByUser: Record<string, Record<string, IdempotencyRecord>>
  pendingReadsByOrder?: Record<string, number>
  manualPendingOrderIds?: string[]
  timedOutBeforeCreation?: string[]
  expiredSessionAttempts?: string[]
}

type OrderResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: OrderErrorResponse }

export function resetOrderState() {
  for (const timer of pendingTimers.values()) clearTimeout(timer)
  pendingTimers.clear()
  localStorage.removeItem(orderStateKey)
}

function schedulePendingOrder(userId: string, orderId: string) {
  if (pendingTimers.has(orderId)) return
  pendingTimers.set(orderId, setTimeout(() => {
    pendingTimers.delete(orderId)
    updateOrderStatus(userId, orderId, 'confirmed')
  }, 1800))
}

export function shouldTimeoutBeforeCreation(userId: string | null, key: string) {
  if (!userId || !key) return false
  const state = readState()
  state.timedOutBeforeCreation ??= []
  const scopedKey = `${userId}:${key}`
  if (state.timedOutBeforeCreation.includes(scopedKey)) return false
  state.timedOutBeforeCreation.push(scopedKey)
  writeState(state)
  return true
}

export function shouldExpireSession(userId: string | null, key: string) {
  if (!userId || !key) return false
  const state = readState()
  state.expiredSessionAttempts ??= []
  const scopedKey = `${userId}:${key}`
  if (state.expiredSessionAttempts.includes(scopedKey)) return false
  state.expiredSessionAttempts.push(scopedKey)
  writeState(state)
  return true
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

  if (order.status === 'pending' && !state.manualPendingOrderIds?.includes(order.id)) {
    schedulePendingOrder(userId, order.id)
    state.pendingReadsByOrder ??= {}
    const reads = (state.pendingReadsByOrder[order.id] ?? 0) + 1
    state.pendingReadsByOrder[order.id] = reads

    if (reads >= 2) {
      order.status = 'confirmed'
      order.version = (order.version ?? 1) + 1
      order.transactionId = `tx-${crypto.randomUUID().slice(0, 12)}`
      order.updatedAt = new Date().toISOString()
    }

    writeState(state)

    if (order.status === 'confirmed') {
      applyConfirmedCart(userId, order)
      emitOrderUpdated({ orderId: order.id, userId, status: order.status, version: order.version! })
    }
  }

  return { ok: true, data: order }
}

export function getOrderByAttempt(
  userId: string | null,
  idempotencyKey: string,
): OrderResult<Order> {
  if (!userId) return unauthenticated()
  const state = readState()
  const record = state.idempotencyByUser[userId]?.[idempotencyKey]
  if (!record) return orderNotFound()
  return getOrder(userId, record.orderId)
}

export function hasOrderAttempt(userId: string | null, idempotencyKey: string) {
  if (!userId) return false
  const state = readState()
  return Boolean(state.idempotencyByUser[userId]?.[idempotencyKey])
}

export function createOrder(
  userId: string | null,
  payload: CreateOrderRequest,
): OrderResult<Order> {
  if (!userId) {
    return unauthenticated()
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
      if (existingOrder.status === 'confirmed' && !existingRecord.cartApplied) {
        applyConfirmedCart(userId, existingOrder)
      }
      return { ok: true, data: existingOrder }
    }
  }

  if (payload.scenario === 'error') {
    return serverError()
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

  if (wallet.status !== 'connected') {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'PAYMENT_DECLINED',
        message: 'Carteira desconectada. Conecte-a antes de confirmar.',
      },
    }
  }

  const now = new Date().toISOString()
  const status = payload.scenario === 'declined'
    ? 'declined'
    : payload.scenario === 'pending' || payload.scenario === 'pending-manual'
      ? 'pending'
      : 'confirmed'
  const order: Order = {
    id: `order-${crypto.randomUUID()}`,
    version: 1,
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
  if (payload.scenario === 'pending-manual') {
    state.manualPendingOrderIds ??= []
    state.manualPendingOrderIds.push(order.id)
  }
  idempotencyRecords[payload.idempotencyKey] = {
    fingerprint,
    orderId: order.id,
    cartApplied: false,
  }
  writeState(state)
  if (status === 'pending') {
    emitOrderUpdated({ orderId: order.id, userId, status, version: 1 })
    if (payload.scenario !== 'pending-manual') schedulePendingOrder(userId, order.id)
  }

  if (order.status === 'confirmed') {
    applyConfirmedCart(userId, order)
  }

  return { ok: true, data: order }
}

export function updateOrderStatus(userId: string | null, orderId: string, status: 'confirmed' | 'declined') {
  if (!userId) return null
  const state = readState()
  const order = state.ordersByUser[userId]?.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending') return null
  order.status = status
  state.manualPendingOrderIds = state.manualPendingOrderIds?.filter((id) => id !== orderId)
  order.version = (order.version ?? 1) + 1
  order.updatedAt = new Date().toISOString()
  order.transactionId = status === 'confirmed' ? `tx-${crypto.randomUUID().slice(0, 12)}` : null
  order.failureReason = status === 'declined' ? 'Pagamento recusado pelo provedor simulado.' : undefined
  writeState(state)
  if (status === 'confirmed') applyConfirmedCart(userId, order)
  emitOrderUpdated({ orderId, userId, status, version: order.version })
  return order
}

function applyConfirmedCart(userId: string, order: Order) {
  const state = readState()
  const recordEntry = Object.entries(state.idempotencyByUser[userId] ?? {})
    .find(([, record]) => record.orderId === order.id)

  if (!recordEntry || recordEntry[1].cartApplied) return
  removePurchasedCartItems(getOwnerKey(userId), order.items, order.id)
  markCartApplied(userId, recordEntry[0])
}

function orderNotFound(): OrderResult<never> {
  return {
    ok: false,
    status: 404,
    error: { code: 'ORDER_NOT_FOUND', message: 'Pedido nao encontrado para esta tentativa.' },
  }
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

  if (!['ethereum', 'polygon', 'base'].includes(payload.network)) {
    fieldErrors.network = 'Selecione uma rede valida.'
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
