import { delay, http, HttpResponse } from 'msw'

import type { LoginRequest, RegisterRequest } from '@/api/types/auth'
import type {
  AddCartItemRequest,
  Cart,
  CartErrorResponse,
  CartScenario,
  Quote,
  QuoteRequest,
  UpdateCartItemRequest,
} from '@/api/types/cart'
import type { CreateOrderRequest, OrderErrorResponse } from '@/api/types/order'
import type {
  CreateWalletRequest,
  UpdateWalletRequest,
  WalletErrorResponse,
  WalletScenario,
} from '@/api/types/wallet'
import type { NftListParams } from '../api/types/nft'
import { findNftById, listNfts, parseMockScenario } from './apiState'
import {
  getCurrentUserId,
  getCurrentProfile,
  getCurrentSession,
  loginUser,
  logoutUser,
  registerUser,
  resetAuthState,
} from './authState'
import {
  addCartItem,
  applyCoupon,
  createQuote,
  getCart,
  getOwnerKey,
  getStoredQuote,
  removeCartItem,
  resetCartState,
  updateCartItem,
} from './cartState'
import { createOrder, getOrder, getOrderByAttempt, hasOrderAttempt, resetOrderState, shouldExpireSession, shouldTimeoutBeforeCreation } from './orderState'
import {
  createWallet,
  listWallets,
  resetWalletState,
  updateWallet,
} from './walletState'

export const handlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const result = registerUser((await request.json()) as RegisterRequest)

    if (!result.ok) {
      return HttpResponse.json(result.error, { status: result.status })
    }

    return HttpResponse.json({ session: result.data }, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const result = loginUser((await request.json()) as LoginRequest)

    if (!result.ok) {
      return HttpResponse.json(result.error, { status: result.status })
    }

    return HttpResponse.json({ session: result.data })
  }),

  http.get('/api/auth/session', () => {
    const result = getCurrentSession()

    if (!result.ok) {
      return HttpResponse.json(result.error, { status: result.status })
    }

    return HttpResponse.json(result.data)
  }),

  http.post('/api/auth/logout', () => {
    logoutUser()

    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/profile', () => {
    const result = getCurrentProfile()

    if (!result.ok) {
      return HttpResponse.json(result.error, { status: result.status })
    }

    return HttpResponse.json({ profile: result.data })
  }),

  http.post('/api/__mock/reset-auth', () => {
    resetAuthState()
    resetCartState()
    resetWalletState()
    resetOrderState()
    localStorage.removeItem('nft-marketplace.checkout-attempt.v1')

    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/wallets', ({ request }) => {
    const scenario = getWalletScenario(request)

    if (scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = listWallets(getCurrentUserId())

    return toWalletsResponse(result)
  }),

  http.post('/api/wallets', async ({ request }) => {
    const payload = (await request.json()) as CreateWalletRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = createWallet(getCurrentUserId(), payload)

    return toWalletResponse(result, 201)
  }),

  http.patch('/api/wallets/:walletId', async ({ params, request }) => {
    const payload = (await request.json()) as UpdateWalletRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = updateWallet(
      getCurrentUserId(),
      String(params.walletId),
      payload,
    )

    return toWalletResponse(result)
  }),

  http.post('/api/orders', async ({ request }) => {
    const payload = (await request.json()) as CreateOrderRequest
    const userId = getCurrentUserId()
    const existing = hasOrderAttempt(userId, payload.idempotencyKey)

    if (
      payload.scenario === 'session-expired' &&
      !existing &&
      shouldExpireSession(userId, payload.idempotencyKey)
    ) {
      logoutUser()
      return toOrderResponse(createOrder(null, payload))
    }

    if (
      payload.scenario === 'timeout-before-create' &&
      !existing &&
      shouldTimeoutBeforeCreation(userId, payload.idempotencyKey)
    ) {
      return HttpResponse.error()
    }

    const result = createOrder(userId, payload)

    if (payload.scenario === 'timeout-after-create' && result.ok && !existing) {
      return HttpResponse.error()
    }

    return toOrderResponse(result, 201)
  }),

  http.get('/api/orders/attempts/:idempotencyKey', ({ params }) => {
    return toOrderResponse(
      getOrderByAttempt(getCurrentUserId(), String(params.idempotencyKey)),
    )
  }),

  http.get('/api/orders/:orderId', ({ params }) => {
    const result = getOrder(getCurrentUserId(), String(params.orderId))

    return toOrderResponse(result)
  }),

  http.get('/api/quotes/:quoteId', ({ params }) => {
    const ownerKey = getOwnerKey(getCurrentUserId())
    const quote = getStoredQuote(ownerKey, String(params.quoteId))
    return quote
      ? HttpResponse.json({ quote })
      : HttpResponse.json(
          { code: 'QUOTE_NOT_FOUND', message: 'Cotacao nao encontrada.' },
          { status: 404 },
        )
  }),

  http.get('/api/cart', ({ request }) => {
    const scenario = getCartScenario(request)

    if (scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = getCart(getOwnerKey(getCurrentUserId()), scenario)

    return toCartResponse(result)
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const payload = (await request.json()) as AddCartItemRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = addCartItem(getOwnerKey(getCurrentUserId()), payload)

    return toCartResponse(result)
  }),

  http.patch('/api/cart/items', async ({ request }) => {
    const payload = (await request.json()) as UpdateCartItemRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = applyCoupon(
      getOwnerKey(getCurrentUserId()),
      payload.couponCode ?? null,
      payload.scenario,
    )

    return toCartResponse(result)
  }),

  http.patch('/api/cart/items/:itemId', async ({ params, request }) => {
    const payload = (await request.json()) as UpdateCartItemRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = updateCartItem(
      getOwnerKey(getCurrentUserId()),
      String(params.itemId),
      payload,
    )

    return toCartResponse(result)
  }),

  http.delete('/api/cart/items/:itemId', ({ params, request }) => {
    if (getCartScenario(request) === 'network-error') {
      return HttpResponse.error()
    }

    const result = removeCartItem(
      getOwnerKey(getCurrentUserId()),
      String(params.itemId),
      getCartScenario(request),
    )

    return toCartResponse(result)
  }),

  http.post('/api/quotes', async ({ request }) => {
    const payload = (await request.json()) as QuoteRequest

    if (payload.scenario === 'network-error') {
      return HttpResponse.error()
    }

    const result = createQuote(
      getOwnerKey(getCurrentUserId()),
      payload.couponCode,
      payload.scenario,
    )

    if (!result.ok) {
      return HttpResponse.json(result.error, { status: result.status })
    }

    return HttpResponse.json({ quote: result.data })
  }),

  http.get('/api/nfts', async ({ request }) => {
    const url = new URL(request.url)
    const scenario = parseMockScenario(url.searchParams.get('scenario'))

    if (scenario === 'latency') {
      await delay(900)
    }

    if (scenario === 'error') {
      return HttpResponse.json(
        {
          code: 'NFTS_SERVICE_UNAVAILABLE',
          message: 'Erro simulado ao buscar NFTs.',
        },
        { status: 500 },
      )
    }

    const params: NftListParams = {
      search: getString(url, 'search'),
      category: getString(url, 'category'),
      chain: getString(url, 'chain'),
      availability: getAvailability(url),
      sort: getSort(url),
      page: getNumber(url, 'page'),
      pageSize: getNumber(url, 'pageSize'),
      scenario,
    }

    return HttpResponse.json(listNfts(params))
  }),

  http.get('/api/nfts/:id', async ({ params, request }) => {
    const url = new URL(request.url)
    const scenario = parseMockScenario(url.searchParams.get('scenario'))

    if (scenario === 'latency') {
      await delay(900)
    }

    if (scenario === 'error') {
      return HttpResponse.json(
        {
          code: 'NFT_SERVICE_UNAVAILABLE',
          message: 'Erro simulado ao buscar o NFT.',
        },
        { status: 500 },
      )
    }

    const nftId = String(params.id)
    const nft = findNftById(nftId)

    if (!nft) {
      return HttpResponse.json(
        {
          code: 'NFT_NOT_FOUND',
          message: 'NFT nao encontrado.',
        },
        { status: 404 },
      )
    }

    return HttpResponse.json(nft)
  }),
]

function getString(url: URL, key: string) {
  const value = url.searchParams.get(key)

  return value?.trim() || undefined
}

function getNumber(url: URL, key: string) {
  const value = Number(url.searchParams.get(key))

  return Number.isFinite(value) && value > 0 ? value : undefined
}

function getAvailability(url: URL) {
  const value = url.searchParams.get('availability')

  if (value === 'available' || value === 'sold') {
    return value
  }

  return 'all'
}

function getSort(url: URL) {
  const value = url.searchParams.get('sort')

  if (value === 'price-asc' || value === 'price-desc' || value === 'name-asc') {
    return value
  }

  return 'newest'
}

function getCartScenario(request: Request) {
  const scenario = new URL(request.url).searchParams.get('scenario')

  if (
    scenario === 'normal' ||
    scenario === 'latency' ||
    scenario === 'error' ||
    scenario === 'empty' ||
    scenario === 'quantity-exceeded' ||
    scenario === 'sold-out' ||
    scenario === 'invalid-coupon' ||
    scenario === 'expired-coupon' ||
    scenario === 'price-change' ||
    scenario === 'network-error'
  ) {
    return scenario satisfies CartScenario
  }

  return undefined
}

function toCartResponse(
  result:
    | { ok: true; data: Cart | Quote }
    | { ok: false; status: number; error: CartErrorResponse },
) {
  if (!result.ok) {
    return HttpResponse.json(result.error, { status: result.status })
  }

  return HttpResponse.json({ cart: result.data })
}

function toWalletsResponse(
  result:
    | { ok: true; data: unknown[] }
    | { ok: false; status: number; error: WalletErrorResponse },
) {
  if (!result.ok) {
    return HttpResponse.json(result.error, { status: result.status })
  }

  return HttpResponse.json({ wallets: result.data })
}

function toWalletResponse(
  result:
    | { ok: true; data: unknown }
    | { ok: false; status: number; error: WalletErrorResponse },
  successStatus = 200,
) {
  if (!result.ok) {
    return HttpResponse.json(result.error, { status: result.status })
  }

  return HttpResponse.json({ wallet: result.data }, { status: successStatus })
}

function toOrderResponse(
  result:
    | { ok: true; data: unknown }
    | { ok: false; status: number; error: OrderErrorResponse },
  successStatus = 200,
) {
  if (!result.ok) {
    return HttpResponse.json(result.error, { status: result.status })
  }

  return HttpResponse.json({ order: result.data }, { status: successStatus })
}

function getWalletScenario(request: Request): WalletScenario | undefined {
  const scenario = new URL(request.url).searchParams.get('scenario')

  if (
    scenario === 'normal' ||
    scenario === 'connection-declined' ||
    scenario === 'network-error' ||
    scenario === 'error'
  ) {
    return scenario
  }

  return undefined
}
