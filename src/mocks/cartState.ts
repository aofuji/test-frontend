import Decimal from 'decimal.js'

import type {
  AddCartItemRequest,
  Cart,
  CartErrorResponse,
  CartItem,
  CartScenario,
  Quote,
  UpdateCartItemRequest,
} from '@/api/types/cart'
import { findNftById } from './apiState'

const cartStateKey = 'nft-marketplace.cart-state.v1'
const guestIdKey = 'nft-marketplace.guest-id.v1'
const networkFeeRate = new Decimal('0.015')
const minimumNetworkFeeEth = new Decimal('0.005')

type StoredCartItem = {
  nftId: string
  editionId: string
  quantity: number
}

type StoredCart = {
  couponCode: string | null
  items: StoredCartItem[]
  updatedAt: string
}

type PersistedCartState = {
  carts: Record<string, StoredCart>
  quotes?: Record<string, StoredQuote>
  appliedOrderIds?: string[]
}

type StoredQuote = {
  ownerKey: string
  quote: Quote
}

type CartResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: CartErrorResponse }

const coupons = {
  SAVE10: {
    label: '10% off',
    expiresAt: '2027-12-31T23:59:59.000Z',
    discountRate: new Decimal('0.10'),
  },
  EXPIRED: {
    label: 'Cupom expirado',
    expiresAt: '2024-01-01T00:00:00.000Z',
    discountRate: new Decimal('0.20'),
  },
}

export function getGuestId() {
  const existing = localStorage.getItem(guestIdKey)

  if (existing) {
    return existing
  }

  const next = `guest-${crypto.randomUUID()}`
  localStorage.setItem(guestIdKey, next)
  return next
}

export function getOwnerKey(userId: string | null) {
  return userId ? `user:${userId}` : `guest:${getGuestId()}`
}

export function resetCartState() {
  localStorage.removeItem(cartStateKey)
  localStorage.removeItem(guestIdKey)
}

export function getStoredQuote(ownerKey: string, quoteId: string) {
  const state = readState()
  const storedQuote = state.quotes?.[quoteId]

  if (!storedQuote || storedQuote.ownerKey !== ownerKey) {
    return null
  }

  return storedQuote.quote
}

export function removePurchasedCartItems(
  ownerKey: string,
  purchasedItems: Array<{ nftId: string; editionId: string; quantity: number }>,
  orderId: string,
) {
  const state = readState()
  state.appliedOrderIds ??= []

  if (state.appliedOrderIds.includes(orderId)) {
    return
  }

  const cart = getStoredCart(state, ownerKey)

  for (const purchasedItem of purchasedItems) {
    const item = cart.items.find(
      (candidate) =>
        candidate.nftId === purchasedItem.nftId &&
        candidate.editionId === purchasedItem.editionId,
    )

    if (!item) {
      continue
    }

    item.quantity -= purchasedItem.quantity
  }

  cart.items = cart.items.filter((item) => item.quantity > 0)

  if (cart.items.length === 0) {
    cart.couponCode = null
  }

  cart.updatedAt = new Date().toISOString()
  state.appliedOrderIds.push(orderId)
  invalidateQuotes(state, ownerKey)
  writeState(state)
}

export function mergeGuestCartIntoUser(userId: string) {
  const state = readState()
  const guestKey = `guest:${getGuestId()}`
  const userKey = getOwnerKey(userId)
  const guestCart = state.carts[guestKey]

  if (!guestCart || guestCart.items.length === 0) {
    return
  }

  const userCart = getStoredCart(state, userKey)

  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find(
      (item) =>
        item.nftId === guestItem.nftId && item.editionId === guestItem.editionId,
    )
    const maxQuantity = getMaxQuantity(guestItem.nftId, guestItem.editionId)

    if (existing) {
      existing.quantity = Math.min(existing.quantity + guestItem.quantity, maxQuantity)
    } else if (maxQuantity > 0) {
      userCart.items.push({
        ...guestItem,
        quantity: Math.min(guestItem.quantity, maxQuantity),
      })
    }
  }

  if (!userCart.couponCode && guestCart.couponCode) {
    userCart.couponCode = guestCart.couponCode
  }

  userCart.items = userCart.items.filter((item) => {
    item.quantity = Math.min(item.quantity, getMaxQuantity(item.nftId, item.editionId))
    return item.quantity > 0
  })
  invalidateQuotes(state, guestKey)
  invalidateQuotes(state, userKey)
  userCart.updatedAt = new Date().toISOString()
  delete state.carts[guestKey]
  writeState(state)
}

export function getCart(ownerKey: string, scenario?: CartScenario): CartResult<Cart> {
  if (scenario === 'network-error') {
    return networkError()
  }

  if (scenario === 'error') {
    return serverError()
  }

  if (scenario === 'empty') {
    return { ok: true, data: buildCart(ownerKey, emptyStoredCart(), scenario) }
  }

  const state = readState()
  const cart = getStoredCart(state, ownerKey)
  const result = buildCart(ownerKey, cart, scenario)
  writeState(state)

  return { ok: true, data: result } as const
}

export function addCartItem(
  ownerKey: string,
  payload: AddCartItemRequest,
): CartResult<Cart> {
  if (payload.scenario === 'network-error') {
    return networkError()
  }

  if (payload.scenario === 'error') {
    return serverError()
  }

  const validation = validateItemPayload(payload)

  if (validation) {
    return validation
  }

  if (payload.scenario === 'sold-out') {
    return soldOutError()
  }

  const state = readState()
  const cart = getStoredCart(state, ownerKey)
  const maxQuantity = getMaxQuantity(payload.nftId, payload.editionId)

  if (maxQuantity < 1) {
    return soldOutError()
  }

  const existing = cart.items.find(
    (item) => item.nftId === payload.nftId && item.editionId === payload.editionId,
  )
  const nextQuantity = (existing?.quantity ?? 0) + payload.quantity

  if (payload.scenario === 'quantity-exceeded' || nextQuantity > maxQuantity) {
    return quantityExceededError(maxQuantity)
  }

  if (existing) {
    existing.quantity = nextQuantity
  } else {
    cart.items.push({
      nftId: payload.nftId,
      editionId: payload.editionId,
      quantity: payload.quantity,
    })
  }

  cart.updatedAt = new Date().toISOString()
  invalidateQuotes(state, ownerKey)
  writeState(state)

  return { ok: true, data: buildCart(ownerKey, cart, payload.scenario) }
}

export function updateCartItem(
  ownerKey: string,
  itemId: string,
  payload: UpdateCartItemRequest,
): CartResult<Cart> {
  if (payload.scenario === 'network-error') {
    return networkError()
  }

  if (payload.scenario === 'error') {
    return serverError()
  }

  const state = readState()
  const cart = getStoredCart(state, ownerKey)
  const item = cart.items.find(
    (candidate) => getItemId(candidate.nftId, candidate.editionId) === itemId,
  )

  if (!item) {
    return itemNotFound()
  }

  if (payload.quantity !== undefined) {
    const maxQuantity = getMaxQuantity(item.nftId, item.editionId)

    if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
      return validationError('quantity', 'Quantidade deve ser um inteiro maior que zero.')
    }

    if (payload.scenario === 'quantity-exceeded' || payload.quantity > maxQuantity) {
      return quantityExceededError(maxQuantity)
    }

    item.quantity = payload.quantity
  }

  cart.updatedAt = new Date().toISOString()
  invalidateQuotes(state, ownerKey)
  writeState(state)

  return { ok: true, data: buildCart(ownerKey, cart, payload.scenario) }
}

export function removeCartItem(
  ownerKey: string,
  itemId: string,
  scenario?: CartScenario,
): CartResult<Cart> {
  if (scenario === 'network-error') {
    return networkError()
  }

  if (scenario === 'error') {
    return serverError()
  }

  const state = readState()
  const cart = getStoredCart(state, ownerKey)
  const nextItems = cart.items.filter(
    (item) => getItemId(item.nftId, item.editionId) !== itemId,
  )

  if (nextItems.length === cart.items.length) {
    return itemNotFound()
  }

  cart.items = nextItems
  cart.updatedAt = new Date().toISOString()
  invalidateQuotes(state, ownerKey)
  writeState(state)

  return { ok: true, data: buildCart(ownerKey, cart, scenario) }
}

export function applyCoupon(
  ownerKey: string,
  couponCode: string | null,
  scenario?: CartScenario,
): CartResult<Cart> {
  if (scenario === 'network-error') {
    return networkError()
  }

  if (scenario === 'error') {
    return serverError()
  }

  const state = readState()
  const cart = getStoredCart(state, ownerKey)

  if (!couponCode) {
    cart.couponCode = null
    cart.updatedAt = new Date().toISOString()
    invalidateQuotes(state, ownerKey)
    writeState(state)
    return { ok: true, data: buildCart(ownerKey, cart, scenario) }
  }

  const coupon = validateCoupon(couponCode, scenario)

  if (!coupon.ok) {
    return coupon
  }

  cart.couponCode = couponCode.trim().toUpperCase()
  cart.updatedAt = new Date().toISOString()
  invalidateQuotes(state, ownerKey)
  writeState(state)

  return { ok: true, data: buildCart(ownerKey, cart, scenario) }
}

export function createQuote(
  ownerKey: string,
  couponCode?: string | null,
  scenario?: CartScenario,
): CartResult<Quote> {
  if (scenario === 'network-error') {
    return networkError()
  }

  if (scenario === 'error') {
    return serverError()
  }

  let cartResult: CartResult<Cart>

  if (couponCode !== undefined) {
    cartResult = applyCoupon(ownerKey, couponCode, scenario)
  } else {
    cartResult = getCart(ownerKey, scenario)
  }

  if (!cartResult.ok) {
    return cartResult
  }

  if (cartResult.data.items.length === 0 || cartResult.data.items.some((item) => !item.available)) {
    return soldOutError()
  }

  const quote: Quote = {
    id: `quote-${crypto.randomUUID()}`,
    cart: cartResult.data,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }
  const state = readState()
  state.quotes ??= {}
  state.quotes[quote.id] = { ownerKey, quote }
  writeState(state)

  return {
    ok: true,
    data: quote,
  }
}

function buildCart(
  ownerKey: string,
  storedCart: StoredCart,
  scenario?: CartScenario,
): Cart {
  const items = storedCart.items
    .map((item) => toCartItem(item, scenario))
    .filter((item): item is CartItem => Boolean(item))
  const subtotal = items.reduce(
    (total, item) =>
      total.plus(new Decimal(item.unitPriceEth).times(item.quantity)),
    new Decimal('0'),
  )
  const couponResult = storedCart.couponCode ? validateCoupon(storedCart.couponCode) : null
  const coupon = couponResult?.ok ? couponResult.data : null
  const discount = coupon ? subtotal.times(coupon.discountRate) : new Decimal('0')
  const networkFee = subtotal.gt(0)
    ? Decimal.max(subtotal.minus(discount).times(networkFeeRate), minimumNetworkFeeEth)
    : new Decimal('0')
  const total = Decimal.max(subtotal.minus(discount).plus(networkFee), new Decimal('0'))

  return {
    id: ownerKey,
    ownerType: ownerKey.startsWith('user:') ? 'user' : 'guest',
    items,
    coupon: coupon
      ? {
          code: storedCart.couponCode ?? '',
          label: coupon.label,
          discountEth: formatEth(discount),
        }
      : null,
    totals: {
      subtotalEth: formatEth(subtotal),
      discountEth: formatEth(discount),
      networkFeeEth: formatEth(networkFee),
      totalEth: formatEth(total),
    },
    updatedAt: storedCart.updatedAt,
  }
}

function toCartItem(item: StoredCartItem, scenario?: CartScenario): CartItem | null {
  const nft = findNftById(item.nftId)
  const edition = nft?.editions.find((candidate) => candidate.id === item.editionId)

  if (!nft || !edition) {
    return null
  }

  const maxQuantity = getMaxQuantity(item.nftId, item.editionId)
  const unitPrice = scenario === 'price-change'
    ? new Decimal(nft.priceEth).plus('0.20')
    : new Decimal(nft.priceEth)

  return {
    id: getItemId(item.nftId, item.editionId),
    nftId: item.nftId,
    editionId: item.editionId,
    editionLabel: edition.label,
    name: nft.name,
    creator: nft.creator,
    collection: nft.collection,
    chain: nft.chain,
    quantity: item.quantity,
    unitPriceEth: formatEth(unitPrice),
    available: nft.available && edition.available && item.quantity <= maxQuantity,
    maxQuantity,
  }
}

function readState(): PersistedCartState {
  const raw = localStorage.getItem(cartStateKey)

  if (!raw) {
    return { carts: {}, quotes: {} }
  }

  try {
    return JSON.parse(raw) as PersistedCartState
  } catch {
    resetCartState()
    return { carts: {}, quotes: {} }
  }
}

function invalidateQuotes(state: PersistedCartState, ownerKey: string) {
  for (const [id, stored] of Object.entries(state.quotes ?? {})) {
    if (stored.ownerKey === ownerKey) {
      delete state.quotes![id]
    }
  }
}

function writeState(state: PersistedCartState) {
  localStorage.setItem(cartStateKey, JSON.stringify(state))
}

function getStoredCart(state: PersistedCartState, ownerKey: string) {
  state.carts[ownerKey] ??= emptyStoredCart()
  return state.carts[ownerKey]
}

function emptyStoredCart(): StoredCart {
  return {
    couponCode: null,
    items: [],
    updatedAt: new Date().toISOString(),
  }
}

function getMaxQuantity(nftId: string, editionId: string) {
  const nft = findNftById(nftId)
  const edition = nft?.editions.find((candidate) => candidate.id === editionId)

  return nft?.available && edition?.available ? (edition.stock ?? 1) : 0
}

function getItemId(nftId: string, editionId: string) {
  return `${nftId}__${editionId}`
}

function validateItemPayload(payload: AddCartItemRequest): CartResult<never> | null {
  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    return validationError('quantity', 'Quantidade deve ser um inteiro maior que zero.')
  }

  const nft = findNftById(payload.nftId)

  if (!nft) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'NFT_NOT_FOUND',
        message: 'NFT nao encontrado.',
      },
    }
  }

  if (!nft.editions.some((edition) => edition.id === payload.editionId)) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'EDITION_NOT_FOUND',
        message: 'Edicao nao encontrada.',
      },
    }
  }

  return null
}

function validateCoupon(
  couponCode: string,
  scenario?: CartScenario,
): CartResult<NonNullable<ReturnType<typeof getCoupon>>> {
  if (scenario === 'invalid-coupon') {
    return invalidCoupon()
  }

  if (scenario === 'expired-coupon') {
    return expiredCoupon()
  }

  const coupon = getCoupon(couponCode)

  if (!coupon) {
    return invalidCoupon()
  }

  if (Date.now() > Date.parse(coupon.expiresAt)) {
    return expiredCoupon()
  }

  return { ok: true, data: coupon }
}

function getCoupon(couponCode: string) {
  const code = couponCode.trim().toUpperCase() as keyof typeof coupons
  return coupons[code] ?? null
}

function formatEth(value: Decimal) {
  return value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed()
}

function validationError(
  field: 'quantity' | 'couponCode',
  message: string,
): CartResult<never> {
  return {
    ok: false,
    status: 400,
    error: {
      code: 'CART_VALIDATION_ERROR',
      message: 'Revise os dados do carrinho.',
      fieldErrors: { [field]: message },
    },
  }
}

function itemNotFound(): CartResult<never> {
  return {
    ok: false,
    status: 404,
    error: {
      code: 'ITEM_NOT_FOUND',
      message: 'Item do carrinho nao encontrado.',
    },
  }
}

function quantityExceededError(maxQuantity: number): CartResult<never> {
  return {
    ok: false,
    status: 409,
    error: {
      code: 'QUANTITY_EXCEEDED',
      message: `Quantidade acima da disponibilidade (${maxQuantity}).`,
      fieldErrors: { quantity: 'Quantidade indisponivel.' },
    },
  }
}

function soldOutError(): CartResult<never> {
  return {
    ok: false,
    status: 409,
    error: {
      code: 'NFT_SOLD_OUT',
      message: 'NFT ou edicao esgotada.',
    },
  }
}

function invalidCoupon(): CartResult<never> {
  return {
    ok: false,
    status: 400,
    error: {
      code: 'INVALID_COUPON',
      message: 'Cupom invalido.',
      fieldErrors: { couponCode: 'Cupom invalido.' },
    },
  }
}

function expiredCoupon(): CartResult<never> {
  return {
    ok: false,
    status: 400,
    error: {
      code: 'EXPIRED_COUPON',
      message: 'Cupom expirado.',
      fieldErrors: { couponCode: 'Cupom expirado.' },
    },
  }
}

function serverError(): CartResult<never> {
  return {
    ok: false,
    status: 500,
    error: {
      code: 'QUOTE_UNAVAILABLE',
      message: 'Erro simulado ao processar carrinho.',
    },
  }
}

function networkError(): CartResult<never> {
  return {
    ok: false,
    status: 503,
    error: {
      code: 'QUOTE_UNAVAILABLE',
      message: 'Falha de conexao simulada.',
    },
  }
}
