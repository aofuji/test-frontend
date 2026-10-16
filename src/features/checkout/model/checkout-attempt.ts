import type { Order, OrderScenario } from '@/api/types/order'
import type { WalletNetwork } from '@/api/types/wallet'

const checkoutAttemptKey = 'nft-marketplace.checkout-attempt.v1'
// This marker never changes the attempt or its idempotency key.
export const checkoutSubmittedAttemptKey = `${checkoutAttemptKey}.submitted`

export type CheckoutAttempt = {
  userId: string
  quoteId: string
  key: string
  walletId: string
  network: WalletNetwork
  scenario: OrderScenario
}

export function readAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = localStorage.getItem(checkoutAttemptKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutAttempt
    return parsed.userId === userId && parsed.quoteId && parsed.key ? parsed : null
  } catch {
    return null
  }
}

export function readSubmittedAttempt(userId: string): Readonly<CheckoutAttempt> | null {
  try {
    const attempt = readAttempt(userId)
    return attempt && localStorage.getItem(checkoutSubmittedAttemptKey) === attempt.key
      ? Object.freeze(attempt)
      : null
  } catch {
    return null
  }
}

export function persistAttempt(input: Omit<CheckoutAttempt, 'key'>) {
  const existing = readAttempt(input.userId)
  const key = existing?.quoteId === input.quoteId &&
    existing.walletId === input.walletId &&
    existing.network === input.network
    ? existing.key
    : `checkout-${crypto.randomUUID()}`
  localStorage.setItem(checkoutAttemptKey, JSON.stringify({ ...input, key }))
  return key
}

export function clearAttempt(expected: Readonly<CheckoutAttempt> | null) {
  if (!expected) return
  const current = readAttempt(expected.userId)
  if (!current || current.key !== expected.key || current.quoteId !== expected.quoteId ||
      current.walletId !== expected.walletId || current.network !== expected.network ||
      current.scenario !== expected.scenario) return
  localStorage.removeItem(checkoutAttemptKey)
  if (localStorage.getItem(checkoutSubmittedAttemptKey) === expected.key) {
    localStorage.removeItem(checkoutSubmittedAttemptKey)
  }
}

// An in-memory revision check; the persisted format and storage keys stay intact.
export function readAttemptSnapshot() {
  try {
    return JSON.stringify([
      localStorage.getItem(checkoutAttemptKey),
      localStorage.getItem(checkoutSubmittedAttemptKey),
    ])
  } catch {
    return null
  }
}

// A receipt lacks the idempotency key: these fields only select a candidate.
// The caller must also resolve its key to the exact order before cleanup.
export function attemptMatchesOrder(attempt: Readonly<CheckoutAttempt>, order: Order) {
  return [attempt.userId, attempt.quoteId, attempt.key, attempt.walletId,
    attempt.network, attempt.scenario].every((value) => typeof value === 'string' && value.length > 0) &&
    attempt.quoteId === order.quoteId && attempt.walletId === order.wallet.id &&
    attempt.network === order.network
}
