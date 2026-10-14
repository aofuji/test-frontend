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
    current: (owner = 'guest') => [...queryKeys.cart.all, 'current', owner] as const,
  },
  wallets: {
    all: () => [...queryKeys.auth.private(), 'wallets'] as const,
    list: () => [...queryKeys.wallets.all(), 'list'] as const,
  },
  orders: {
    all: () => [...queryKeys.auth.private(), 'orders'] as const,
    list: () => [...queryKeys.orders.all(), 'list'] as const,
    detail: (orderId: string) => [...queryKeys.orders.all(), 'detail', orderId] as const,
  },
}
