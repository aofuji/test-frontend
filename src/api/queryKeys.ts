import type { NftListParams } from './types/nft'

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    private: () => [...queryKeys.auth.all, 'private'] as const,
    profile: () => [...queryKeys.auth.private(), 'profile'] as const,
  },
  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) =>
      [...queryKeys.nfts.all, 'list', params] as const,
    detail: (nftId: string, scenario?: NftListParams['scenario']) =>
      [...queryKeys.nfts.all, 'detail', nftId, scenario] as const,
  },
  cart: {
    all: ['cart'] as const,
    current: () => [...queryKeys.cart.all, 'current'] as const,
  },
}
