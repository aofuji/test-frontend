import type { FavoritesErrorResponse } from '@/api/types/favorites'
import { findNftById } from './apiState'

const key = 'nft-marketplace.favorites.v1'
const failureKey = 'nft-marketplace.favorites-next-failure.v1'
type State = Record<string, string[]>
type Result =
  | { ok: true; data: string[] }
  | { ok: false; status: number; error: FavoritesErrorResponse }

export function resetFavoritesState() { localStorage.removeItem(key); localStorage.removeItem(failureKey) }

export function setNextFavoriteFailure(value: 'error' | 'network-error') {
  localStorage.setItem(failureKey, value)
}

export function takeNextFavoriteFailure() {
  const value = localStorage.getItem(failureKey)
  localStorage.removeItem(failureKey)
  return value === 'error' || value === 'network-error' ? value : null
}

export function getFavorites(userId: string | null): Result {
  if (!userId) return unauthenticated()
  return { ok: true, data: readState()[userId] ?? [] }
}

export function setFavorite(userId: string | null, nftId: string, favorite: boolean): Result {
  if (!userId) return unauthenticated()
  if (!findNftById(nftId)) return { ok: false, status: 404, error: {
    code: 'NFT_NOT_FOUND', message: 'NFT nao encontrado.',
  } }
  const state = readState()
  const current = state[userId] ?? []
  state[userId] = favorite
    ? current.includes(nftId) ? current : [...current, nftId]
    : current.filter((id) => id !== nftId)
  localStorage.setItem(key, JSON.stringify(state))
  return { ok: true, data: state[userId] }
}

function readState(): State {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as State : {}
  } catch {
    resetFavoritesState()
    return {}
  }
}

function unauthenticated(): Result {
  return { ok: false, status: 401, error: {
    code: 'UNAUTHENTICATED', message: 'Faca login para gerenciar favoritos.',
  } }
}
