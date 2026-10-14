import type {
  CreateWalletRequest,
  UpdateWalletRequest,
  Wallet,
  WalletConnectionStatus,
  WalletErrorResponse,
  WalletKind,
  WalletNetwork,
} from '@/api/types/wallet'
import { mockUsers } from './fixtures/users'

const walletStateKey = 'nft-marketplace.wallet-state.v1'
const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/

type PersistedWalletState = {
  walletsByUser: Record<string, Wallet[]>
}

type WalletResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: WalletErrorResponse }

export function resetWalletState() {
  localStorage.removeItem(walletStateKey)
}

export function listWallets(userId: string | null): WalletResult<Wallet[]> {
  if (!userId) {
    return unauthenticated()
  }

  const state = readState()
  state.walletsByUser[userId] ??= seedWallets(userId)
  writeState(state)

  return { ok: true, data: state.walletsByUser[userId] }
}

export function getWallet(userId: string, walletId: string) {
  const state = readState()
  state.walletsByUser[userId] ??= seedWallets(userId)
  const wallet = state.walletsByUser[userId].find(
    (candidate) => candidate.id === walletId,
  )

  writeState(state)

  return wallet ?? null
}

export function createWallet(
  userId: string | null,
  payload: CreateWalletRequest,
): WalletResult<Wallet> {
  if (!userId) {
    return unauthenticated()
  }

  if (payload.scenario === 'error') {
    return serverError()
  }

  if (payload.scenario === 'connection-declined') {
    return connectionDeclined()
  }

  const validation = validateWallet(payload)

  if (validation) {
    return validation
  }

  const state = readState()
  const wallets = state.walletsByUser[userId] ?? seedWallets(userId)
  const now = new Date().toISOString()
  const shouldDefault = payload.isDefault || payload.kind === 'primary' || wallets.length === 0
  const wallet: Wallet = {
    id: `wallet-${crypto.randomUUID()}`,
    label: payload.label.trim(),
    address: payload.address.trim(),
    network: payload.network,
    kind: shouldDefault ? 'primary' : 'secondary',
    status: 'connected',
    isDefault: shouldDefault,
    createdAt: now,
    updatedAt: now,
  }

  if (shouldDefault) {
    markSingleDefault(wallets)
  }

  wallets.push(wallet)
  state.walletsByUser[userId] = wallets
  writeState(state)

  return { ok: true, data: wallet }
}

export function updateWallet(
  userId: string | null,
  walletId: string,
  payload: UpdateWalletRequest,
): WalletResult<Wallet> {
  if (!userId) {
    return unauthenticated()
  }

  if (payload.scenario === 'error') {
    return serverError()
  }

  if (payload.scenario === 'connection-declined') {
    return connectionDeclined()
  }

  const state = readState()
  const wallets = state.walletsByUser[userId] ?? seedWallets(userId)
  const wallet = wallets.find((candidate) => candidate.id === walletId)

  if (!wallet) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'WALLET_NOT_FOUND',
        message: 'Carteira nao encontrada.',
      },
    }
  }

  const validation = validateWallet({
    label: payload.label ?? wallet.label,
    address: payload.address ?? wallet.address,
    network: payload.network ?? wallet.network,
    kind: payload.kind,
  })

  if (validation) {
    return validation
  }

  if (payload.status && payload.status !== 'connected' && payload.status !== 'disconnected') {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'WALLET_VALIDATION_ERROR',
        message: 'Confira os dados da carteira.',
        fieldErrors: { status: 'Estado de conexao invalido.' },
      },
    }
  }

  const nextDefault = payload.isDefault === true || payload.kind === 'primary'
  if (payload.kind === 'secondary' && wallet.isDefault && wallets.length === 1) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'WALLET_VALIDATION_ERROR',
        message: 'Cadastre outra carteira antes de alterar a principal.',
        fieldErrors: { kind: 'Uma carteira principal e necessaria.' },
      },
    }
  }

  if (nextDefault) {
    markSingleDefault(wallets)
  } else if (payload.kind === 'secondary' && wallet.isDefault) {
    const replacement = wallets.find((candidate) => candidate.id !== wallet.id)
    if (replacement) {
      replacement.isDefault = true
      replacement.kind = 'primary'
    }
  }

  Object.assign(wallet, {
    label: payload.label?.trim() ?? wallet.label,
    address: payload.address?.trim() ?? wallet.address,
    network: payload.network ?? wallet.network,
    kind: nextDefault ? 'primary' : payload.kind ?? wallet.kind,
    status: payload.status ?? wallet.status,
    isDefault: nextDefault ? true : payload.kind === 'secondary' ? false : wallet.isDefault,
    updatedAt: new Date().toISOString(),
  })

  state.walletsByUser[userId] = wallets
  writeState(state)

  return { ok: true, data: wallet }
}

function seedWallets(userId: string) {
  const user = mockUsers.find((candidate) => candidate.id === userId)

  if (!user?.walletAddress) {
    return []
  }

  const now = user.createdAt

  return [
    {
      id: `wallet-${userId}-primary`,
      label: 'Carteira principal',
      address: user.walletAddress,
      network: 'ethereum' as WalletNetwork,
      kind: 'primary' as WalletKind,
      status: 'connected' as WalletConnectionStatus,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function markSingleDefault(wallets: Wallet[]) {
  for (const wallet of wallets) {
    wallet.isDefault = false
    wallet.kind = wallet.kind === 'primary' ? 'secondary' : wallet.kind
  }
}

function validateWallet(payload: {
  label: string
  address: string
  network: WalletNetwork
  kind?: WalletKind
}): WalletResult<never> | null {
  const fieldErrors: Record<string, string> = {}

  if (!payload.label.trim()) {
    fieldErrors.label = 'Informe um nome para a carteira.'
  }

  if (!walletAddressPattern.test(payload.address.trim())) {
    fieldErrors.address = 'Informe um endereco EVM valido.'
  }

  if (!['ethereum', 'polygon', 'base'].includes(payload.network)) {
    fieldErrors.network = 'Selecione uma rede valida.'
  }

  if (payload.kind && payload.kind !== 'primary' && payload.kind !== 'secondary') {
    fieldErrors.kind = 'Selecione um tipo valido.'
  }

  if (Object.keys(fieldErrors).length === 0) {
    return null
  }

  return {
    ok: false,
    status: 400,
    error: {
      code: 'WALLET_VALIDATION_ERROR',
      message: 'Confira os dados da carteira.',
      fieldErrors,
    },
  }
}

function readState(): PersistedWalletState {
  const raw = localStorage.getItem(walletStateKey)

  if (!raw) {
    return { walletsByUser: {} }
  }

  try {
    return JSON.parse(raw) as PersistedWalletState
  } catch {
    resetWalletState()
    return { walletsByUser: {} }
  }
}

function writeState(state: PersistedWalletState) {
  localStorage.setItem(walletStateKey, JSON.stringify(state))
}

function unauthenticated(): WalletResult<never> {
  return {
    ok: false,
    status: 401,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Faca login para gerenciar carteiras.',
    },
  }
}

function connectionDeclined(): WalletResult<never> {
  return {
    ok: false,
    status: 409,
    error: {
      code: 'WALLET_CONNECTION_DECLINED',
      message: 'Conexao recusada pela carteira simulada.',
    },
  }
}

function serverError(): WalletResult<never> {
  return {
    ok: false,
    status: 500,
    error: {
      code: 'WALLET_SERVICE_UNAVAILABLE',
      message: 'Erro simulado ao processar a carteira.',
    },
  }
}
