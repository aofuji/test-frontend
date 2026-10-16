import type { NftListParams } from './types/nft'

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    private: () => [...queryKeys.auth.all, 'private'] as const,
    profile: (userId: string | undefined) => [...queryKeys.auth.private(), 'profile', userId] as const,
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
    list: (userId: string | undefined) => [...queryKeys.wallets.all(), 'list', userId] as const,
  },
  orders: {
    all: () => [...queryKeys.auth.private(), 'orders'] as const,
    list: (userId: string | undefined) => [...queryKeys.orders.all(), 'list', userId] as const,
    detail: (orderId: string, userId: string | undefined) => [...queryKeys.orders.all(), 'detail', orderId, userId] as const,
  },
  favorites: {
    all: () => [...queryKeys.auth.private(), 'favorites'] as const,
    list: (userId: string) => [...queryKeys.favorites.all(), userId] as const,
  },
}
