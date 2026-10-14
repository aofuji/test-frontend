import type { NftListParams } from './types/nft'

export const queryKeys = {
  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) =>
      [...queryKeys.nfts.all, 'list', params] as const,
    detail: (nftId: string, scenario?: NftListParams['scenario']) =>
      [...queryKeys.nfts.all, 'detail', nftId, scenario] as const,
  },
}
