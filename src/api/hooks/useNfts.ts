import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { getNftById, getNfts } from '../nfts'
import { queryKeys } from '../queryKeys'
import type { NftListParams } from '../types/nft'

export function useNfts(params: NftListParams) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => getNfts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useNftDetail(nftId: string, scenario?: NftListParams['scenario']) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(nftId, scenario),
    queryFn: ({ signal }) => getNftById(nftId, { scenario, signal }),
  })
}
