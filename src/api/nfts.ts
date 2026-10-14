import { apiClient } from './http/client'
import type { Nft, NftListParams, NftListResponse } from './types/nft'

export async function getNfts(params: NftListParams, signal?: AbortSignal) {
  const response = await apiClient.get<NftListResponse>('/nfts', {
    params,
    signal,
  })

  return response.data
}

export async function getNftById(
  nftId: string,
  options?: { scenario?: NftListParams['scenario']; signal?: AbortSignal },
) {
  const response = await apiClient.get<Nft>(`/nfts/${nftId}`, {
    params: { scenario: options?.scenario },
    signal: options?.signal,
  })

  return response.data
}
