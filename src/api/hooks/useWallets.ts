import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createWallet, getWallets, updateWallet } from '../wallets'
import { queryKeys } from '../queryKeys'
import type { CreateWalletRequest, UpdateWalletRequest } from '../types/wallet'

export function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets.list(),
    queryFn: ({ signal }) => getWallets(signal),
    retry: false,
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateWalletRequest) => createWallet(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() })
    },
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
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
