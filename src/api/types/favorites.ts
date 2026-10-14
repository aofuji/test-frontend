export type FavoritesResponse = { nftIds: string[] }
export type FavoritesScenario = 'error' | 'network-error' | 'latency'
export type FavoriteMutation = {
  nftId: string
  favorite: boolean
  scenario?: FavoritesScenario
}

export type FavoritesErrorResponse = {
  code: 'UNAUTHENTICATED' | 'NFT_NOT_FOUND' | 'FAVORITES_UNAVAILABLE'
  message: string
}
