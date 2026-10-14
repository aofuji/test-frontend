import { apiClient } from './http/client'
import type { FavoritesResponse, FavoritesScenario } from './types/favorites'

export async function getFavorites(signal?: AbortSignal) {
  const response = await apiClient.get<FavoritesResponse>('/favorites', { signal })
  return response.data.nftIds
}

export async function setFavorite(nftId: string, favorite: boolean, scenario?: FavoritesScenario) {
  const path = `/favorites/${encodeURIComponent(nftId)}`
  const response = favorite
    ? await apiClient.put<FavoritesResponse>(path, null, { params: { scenario } })
    : await apiClient.delete<FavoritesResponse>(path, { params: { scenario } })
  return response.data.nftIds
}
