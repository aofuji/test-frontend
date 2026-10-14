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
  removeCartItem,
  resetCartState,
  updateCartItem,
} from './cartState'

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

    return HttpResponse.json({ ok: true })
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
