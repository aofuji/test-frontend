import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { getSession } from '@/api/auth'
import { getQuote } from '@/api/cart'
import { getOrderByAttempt } from '@/api/orders'
import { useSession } from '@/api/hooks/useAuth'
import { useCart, useCreateQuote } from '@/api/hooks/useCart'
import { useCreateOrder } from '@/api/hooks/useOrders'
import { useWallets } from '@/api/hooks/useWallets'
import { ApiError } from '@/api/http/errors'
import type { Quote } from '@/api/types/cart'
import type { OrderScenario } from '@/api/types/order'
import type { WalletNetwork } from '@/api/types/wallet'
import { Button } from '@/components/ui/button'
import { CheckoutCollectorFields } from '@/features/checkout/components/checkout-collector-fields'
import { CheckoutDevelopmentControls } from '@/features/checkout/components/checkout-development-controls'
import { CheckoutMobileHeading } from '@/features/checkout/components/checkout-mobile-heading'
import { CheckoutLoading, CheckoutStateCard } from '@/features/checkout/components/checkout-states'
import { CheckoutSummary } from '@/features/checkout/components/checkout-summary'
import { CheckoutWalletFields } from '@/features/checkout/components/checkout-wallet-fields'
import {
  checkoutSubmittedAttemptKey,
  clearAttempt,
  persistAttempt,
  readAttempt,
  readAttemptSnapshot,
  readSubmittedAttempt,
  type CheckoutAttempt,
} from '@/features/checkout/model/checkout-attempt'
import { nftNoticeEvent } from '@/realtime/useRealtime'
import type { NftUpdatedEvent } from '@/api/types/realtime'

import './checkout.css'
import './checkout-mobile.css'

function CheckoutPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const sessionQuery = useSession()
  const cartQuery = useCart()
  const walletsQuery = useWallets()
  const quoteMutation = useCreateQuote()
  const orderMutation = useCreateOrder()
  const operationOwner = useRef<symbol | null>(null)
  const actionInProgress = useRef(false)
  const selectionLock = useRef(false)
  const submittedAttempt = useRef<Readonly<CheckoutAttempt> | null>(null)
  const [selectionLocked, setSelectionLocked] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [network, setNetwork] = useState<WalletNetwork>('ethereum')
  const [scenario, setScenario] = useState<OrderScenario>('confirmed')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)
  const [recoveryPending, setRecoveryPending] = useState(true)
  const [recoveryError, setRecoveryError] = useState(false)
  const userId = sessionQuery.data?.user.id

  useLayoutEffect(() => {
    // A fresh identity for every setup also invalidates work from StrictMode's
    // setup/cleanup/setup replay and from the previous authenticated user.
    const owner = Symbol('checkout')
    operationOwner.current = owner
    actionInProgress.current = false
    return () => {
      if (operationOwner.current === owner) operationOwner.current = null
    }
  }, [userId])

  const createOperation = useCallback(() => {
    const owner = operationOwner.current
    let snapshot = readAttemptSnapshot()
    const ownsView = () => owner !== null && operationOwner.current === owner &&
      router.latestLocation.pathname.replace(/\/+$/, '') === '/checkout'
    return {
      ownsView,
      isCurrent: () => ownsView() && readAttemptSnapshot() === snapshot,
      recordOwnWrite: () => { snapshot = readAttemptSnapshot() },
    }
  }, [router])

  useEffect(() => {
    function onNftUpdated(raw: Event) {
      const event = (raw as CustomEvent<NftUpdatedEvent>).detail
      if (!cartQuery.data?.items.some((item) => item.nftId === event.nftId) &&
          !quote?.cart.items.some((item) => item.nftId === event.nftId)) return
      setQuote(null)
      setStatusMessage('Um NFT do carrinho mudou. Atualize a cotacao e revise os valores antes de confirmar.')
      setStatusIsError(true)
    }
    window.addEventListener(nftNoticeEvent, onNftUpdated)
    return () => window.removeEventListener(nftNoticeEvent, onNftUpdated)
  }, [cartQuery.data?.items, quote])

  useEffect(() => {
    if (!userId) return
    let active = true
    const operation = createOperation()
    const attempt = readAttempt(userId)
    let unresolvedSubmission = Boolean(readSubmittedAttempt(userId))

    async function recover() {
      if (!attempt) {
        if (active && operation.isCurrent()) {
          submittedAttempt.current = null
          lockSelection(false)
          setRecoveryPending(false)
        }
        return
      }

      try {
        const order = await getOrderByAttempt(attempt.key)
        if (!active || !operation.isCurrent()) return
        if (order.status !== 'declined') {
          if (order.status === 'confirmed') {
            clearAttempt(attempt)
            operation.recordOwnWrite()
          }
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
          return
        }
        // A declined order resolves the submitted attempt. A missing order
        // does not establish whether the original POST will complete.
        unresolvedSubmission = false
        submittedAttempt.current = null
        lockSelection(false)
        clearAttempt(attempt)
        operation.recordOwnWrite()
      } catch (error) {
        if (!active || !operation.isCurrent()) return
        if (!(error instanceof ApiError && error.status === 404)) {
          if (active && operation.isCurrent()) {
            setStatusMessage(getErrorMessage(error))
            setStatusIsError(true)
            setRecoveryError(true)
            setRecoveryPending(false)
          }
          return
        }
      }

      try {
        const restoredQuote = await getQuote(attempt.quoteId)
        if (!active || !operation.isCurrent()) return
        setQuote(restoredQuote)
        setSelectedWalletId(attempt.walletId)
        setNetwork(attempt.network)
        setScenario(attempt.scenario)
        submittedAttempt.current = readSubmittedAttempt(userId!)
        lockSelection(Boolean(submittedAttempt.current))
      } catch (error) {
        if (active && operation.isCurrent()) {
          if (error instanceof ApiError && error.status === 404 && !unresolvedSubmission) {
            clearAttempt(attempt)
            operation.recordOwnWrite()
          } else {
            setRecoveryError(true)
          }
          setStatusMessage(getErrorMessage(error))
          setStatusIsError(true)
        }
      } finally {
        if (active && operation.isCurrent()) setRecoveryPending(false)
      }
    }

    void recover()
    return () => { active = false }
  }, [createOperation, navigate, userId])

  const wallets = walletsQuery.data ?? []
  const selectedWallet =
    wallets.find((wallet) => wallet.id === selectedWalletId) ??
    wallets.find((wallet) => wallet.isDefault) ??
    wallets[0]
  const cart = cartQuery.data
  const isLoading = cartQuery.isLoading || walletsQuery.isLoading || recoveryPending
  const error = cartQuery.error ?? walletsQuery.error
  const canCheckout = Boolean(
    cart?.items.length &&
    cart.items.every((item) => item.available) &&
    selectedWallet?.status === 'connected',
  )

  function lockSelection(locked: boolean) {
    selectionLock.current = locked
    setSelectionLocked(locked)
  }

  function selectWallet(walletId: string) {
    if (selectionLock.current) return
    setSelectedWalletId(walletId)
    setQuote(null)
    clearAttempt(userId ? readAttempt(userId) : null)
    const wallet = wallets.find((candidate) => candidate.id === walletId)
    if (wallet) setNetwork(wallet.network)
  }

  async function ensureActiveSession(isCurrent: () => boolean) {
    try {
      const session = await getSession()
      if (!isCurrent()) return false
      if (!session || session.user.id !== userId) throw new Error('Sessao expirada.')
      return true
    } catch {
      if (isCurrent()) void navigate({ to: '/login', search: { redirect: '/checkout' } })
      return false
    }
  }

  async function handleQuote() {
    if (actionInProgress.current || submittedAttempt.current) return
    const operation = createOperation()
    if (!operation.isCurrent()) return
    actionInProgress.current = true
    try {
      setStatusMessage('')
      setStatusIsError(false)
      if (!userId || !(await ensureActiveSession(operation.isCurrent)) || !operation.isCurrent()) return

      try {
        const nextQuote = await quoteMutation.mutateAsync({
          scenario: scenario === 'price-change' ? 'price-change' : undefined,
        })
        if (!operation.isCurrent()) return
        setQuote(nextQuote)
        persistAttempt({
          userId,
          quoteId: nextQuote.id,
          walletId: selectedWallet?.id ?? '',
          network,
          scenario,
        })
        operation.recordOwnWrite()
        setStatusMessage('Cotacao atualizada. Revise os valores antes de confirmar.')
      } catch (error) {
        if (!operation.isCurrent()) return
        setStatusMessage(getErrorMessage(error))
        setStatusIsError(true)
        if (error instanceof ApiError && error.status === 401) {
          void navigate({ to: '/login', search: { redirect: '/checkout' } })
        }
      }
    } finally {
      if (operation.ownsView()) actionInProgress.current = false
    }
  }

  async function handleConfirm() {
    if (actionInProgress.current) return
    const operation = createOperation()
    if (!operation.isCurrent()) return
    actionInProgress.current = true
    lockSelection(true)
    const selection = Object.freeze({ walletId: selectedWallet?.id ?? '', network, scenario })
    const quoteId = quote?.id
    const resumedAttempt = submittedAttempt.current?.userId === userId ? submittedAttempt.current : null
    try {
      if (!userId || !(await ensureActiveSession(operation.isCurrent)) || !operation.isCurrent()) return
      if (!resumedAttempt && (!quoteId || !selection.walletId)) {
        try {
          const nextQuote = await quoteMutation.mutateAsync({})
          if (!operation.isCurrent()) return
          setQuote(nextQuote)
          persistAttempt({ userId, quoteId: nextQuote.id, ...selection })
          operation.recordOwnWrite()
          setStatusMessage(
            'Cotacao inicial gerada. Clique novamente para confirmar a compra.',
          )
        } catch (error) {
          if (!operation.isCurrent()) return
          setStatusMessage(getErrorMessage(error))
          setStatusIsError(true)
        }
        return
      }

      const context = resumedAttempt ?? { userId, quoteId: quoteId!, ...selection }
      const attempt = Object.freeze({
        ...context,
        key: resumedAttempt?.key ?? persistAttempt(context),
      })
      operation.recordOwnWrite()
      setStatusMessage('')
      setStatusIsError(false)

      try {
        // Persist only the correlation before submitting. Recovery still uses
        // the existing order lookup and quote restoration, in the same order.
        localStorage.setItem(checkoutSubmittedAttemptKey, attempt.key)
        submittedAttempt.current = attempt
        operation.recordOwnWrite()
        const order = await orderMutation.mutateAsync({
          quoteId: attempt.quoteId,
          walletId: attempt.walletId,
          network: attempt.network,
          idempotencyKey: attempt.key,
          scenario: attempt.scenario,
        })

        if (!operation.isCurrent()) return
        if (order.status === 'confirmed') {
          submittedAttempt.current = null
          clearAttempt(attempt)
          operation.recordOwnWrite()
          await navigate({
            to: '/orders/$orderId',
            params: { orderId: order.id },
          })
          return
        }

        if (order.status === 'pending') {
          await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
          return
        }

        submittedAttempt.current = null
        clearAttempt(attempt)
        operation.recordOwnWrite()
        setQuote(null)
        setStatusMessage(
          order.failureReason ??
            'Pagamento recusado. O carrinho foi preservado para nova tentativa.',
        )
      } catch (error) {
        if (!operation.isCurrent()) return
        setStatusMessage(getErrorMessage(error))
        setStatusIsError(true)

        if (error instanceof ApiError && error.status === 401) {
          void navigate({ to: '/login', search: { redirect: '/checkout' } })
        } else if (
          error instanceof ApiError &&
          error.status !== undefined &&
          error.code !== 'ORDER_SERVICE_UNAVAILABLE'
        ) {
          submittedAttempt.current = null
          setQuote(null)
          clearAttempt(attempt)
          operation.recordOwnWrite()
        }
      }
    } finally {
      if (operation.isCurrent()) lockSelection(Boolean(submittedAttempt.current))
      if (operation.ownsView()) actionInProgress.current = false
    }
  }

  if (isLoading) {
    return <CheckoutLoading />
  }

  if (recoveryError) {
    return (
      <CheckoutStateCard
        title="Nao foi possivel recuperar a tentativa"
        description={statusMessage}
        action={<Button type="button" onClick={() => window.location.reload()}>Tentar novamente</Button>}
      />
    )
  }

  if (error) {
    return (
      <CheckoutStateCard
        title="Nao foi possivel carregar o checkout"
        description={getErrorMessage(error)}
        action={<Button onClick={() => { void cartQuery.refetch(); void walletsQuery.refetch() }}>Tentar novamente</Button>}
      />
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <CheckoutStateCard
        title="Seu carrinho esta vazio"
        description="Adicione um NFT antes de iniciar o checkout."
        action={
          <Button asChild>
            <Link to="/" search={defaultCatalogSearch}>
              Voltar ao catalogo
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <section className="checkout-page" data-review-open={reviewOpen}>
      <CheckoutMobileHeading />
      <nav className="checkout-breadcrumb" aria-label="Caminho de navegação">
        <Link to="/" search={defaultCatalogSearch}>Início</Link>
        <span aria-hidden="true">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo">Mercado</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="checkout-title">Confirmar compra</h1>

      <div className="checkout-layout">
        <div className="checkout-collector">
          <CheckoutCollectorFields
            name={sessionQuery.data?.user.name ?? ''}
            email={sessionQuery.data?.user.email ?? ''}
          />

          <CheckoutWalletFields
            wallets={wallets}
            selectedWallet={selectedWallet}
            network={network}
            disabled={selectionLocked}
            onWalletChange={selectWallet}
            onNetworkChange={(value) => {
              if (selectionLock.current) return
              setNetwork(value as WalletNetwork)
              setQuote(null)
              clearAttempt(userId ? readAttempt(userId) : null)
            }}
          />

          {import.meta.env.DEV || import.meta.env.MODE === 'test' ? (
            <CheckoutDevelopmentControls
              scenario={scenario}
              disabled={selectionLocked}
              onScenarioChange={(value) => {
                if (selectionLock.current) return
                setScenario(value as OrderScenario)
                setQuote(null)
                clearAttempt(userId ? readAttempt(userId) : null)
              }}
            />
          ) : null}
        </div>

        <CheckoutSummary
          cart={cart}
          selectedWallet={selectedWallet}
          network={network}
          reviewOpen={reviewOpen}
          onToggleReview={() => setReviewOpen((current) => !current)}
          quoteExpiration={quote ? formatDate(quote.expiresAt) : null}
          statusMessage={statusMessage}
          statusIsError={statusIsError}
          actions={
            <div className="checkout-actions">
              <Button
                variant="outline"
                onClick={() => void handleQuote()}
                disabled={selectionLocked || quoteMutation.isPending || orderMutation.isPending}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                {quoteMutation.isPending ? 'Atualizando...' : 'Revalidar cotacao'}
              </Button>
              <Button
                className="checkout-confirm"
                onClick={() => void handleConfirm()}
                disabled={!canCheckout || orderMutation.isPending || quoteMutation.isPending}
              >
                {orderMutation.isPending ? 'Confirmando...' : 'Confirmar compra'}
              </Button>
            </div>
          }
        />
      </div>
    </section>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Nao foi possivel completar a acao.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => context.auth.ensureSession(location),
  component: CheckoutPage,
})
