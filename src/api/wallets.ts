import { apiClient } from './http/client'
import type {
  CreateWalletRequest,
  UpdateWalletRequest,
  WalletResponse,
  WalletsResponse,
} from './types/wallet'

export async function getWallets(signal?: AbortSignal) {
  const response = await apiClient.get<WalletsResponse>('/wallets', { signal })

  return response.data.wallets
}

export async function createWallet(payload: CreateWalletRequest) {
  const response = await apiClient.post<WalletResponse>('/wallets', payload)

  return response.data.wallet
}

export async function updateWallet(
  walletId: string,
  payload: UpdateWalletRequest,
) {
  const response = await apiClient.patch<WalletResponse>(
    `/wallets/${walletId}`,
    payload,
  )

  return response.data.wallet
}
