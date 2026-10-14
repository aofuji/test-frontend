export type WalletNetwork = 'ethereum' | 'polygon' | 'base'

export type WalletKind = 'primary' | 'secondary'

export type WalletConnectionStatus = 'connected' | 'disconnected'

export type WalletScenario =
  | 'normal'
  | 'connection-declined'
  | 'network-error'
  | 'error'

export type Wallet = {
  id: string
  label: string
  address: string
  network: WalletNetwork
  kind: WalletKind
  status: WalletConnectionStatus
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type CreateWalletRequest = {
  label: string
  address: string
  network: WalletNetwork
  kind?: WalletKind
  isDefault?: boolean
  scenario?: WalletScenario
}

export type UpdateWalletRequest = {
  label?: string
  address?: string
  network?: WalletNetwork
  kind?: WalletKind
  status?: WalletConnectionStatus
  isDefault?: boolean
  scenario?: WalletScenario
}

export type WalletsResponse = {
  wallets: Wallet[]
}

export type WalletResponse = {
  wallet: Wallet
}

export type WalletErrorCode =
  | 'WALLET_VALIDATION_ERROR'
  | 'WALLET_NOT_FOUND'
  | 'WALLET_CONNECTION_DECLINED'
  | 'WALLET_SERVICE_UNAVAILABLE'
  | 'UNAUTHENTICATED'

export type WalletErrorResponse = {
  code: WalletErrorCode
  message: string
  fieldErrors?: Partial<Record<keyof CreateWalletRequest | keyof UpdateWalletRequest, string>>
}
