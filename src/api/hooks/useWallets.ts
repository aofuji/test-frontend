import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createWallet, getWallets, updateWallet } from '../wallets'
import { queryKeys } from '../queryKeys'
import type { CreateWalletRequest, UpdateWalletRequest } from '../types/wallet'
import { useSession } from './useAuth'
import { usePrivateMutation } from './usePrivateMutation'

export function useWallets() {
  const userId = useSession().data?.user.id
  return useQuery({
    queryKey: queryKeys.wallets.list(userId),
    queryFn: ({ signal }) => getWallets(signal),
    retry: false,
    enabled: Boolean(userId),
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()

  return usePrivateMutation({
    mutationFn: (payload: CreateWalletRequest) => createWallet(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() })
    },
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()

  return usePrivateMutation({
    mutationFn: ({
      walletId,
      payload,
    }: {
      walletId: string
      payload: UpdateWalletRequest
    }) => updateWallet(walletId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() })
    },
  })
}
