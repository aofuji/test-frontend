import { delay, http, HttpResponse } from 'msw'

import type { LoginRequest, RegisterRequest } from '@/api/types/auth'
import type { NftListParams } from '../api/types/nft'
import { findNftById, listNfts, parseMockScenario } from './apiState'
import {
  getCurrentProfile,
  getCurrentSession,
  loginUser,
  logoutUser,
  registerUser,
  resetAuthState,
} from './authState'

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

    return HttpResponse.json({ ok: true })
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
