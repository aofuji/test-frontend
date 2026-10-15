import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { nftNoticeEvent } from '@/realtime/useRealtime'
import type { NftUpdatedEvent } from '@/api/types/realtime'

const checkoutAttemptKey = 'nft-marketplace.checkout-attempt.v1'
const checkoutImageByNftId: Record<string, string> = {
  'aurora-001': '/images/nfts/nft1.png',
  'block-bloom-155': '/images/nfts/nft1.png',
  'solar-thread-019': '/images/nfts/nft2.png',
  'glass-house-071': '/images/nfts/nft2.png',
  'mono-mask-008': '/images/nfts/nft2.png',
  'orbit-512': '/images/nfts/nft3.png',
  'vault-echo-300': '/images/nfts/nft3.png',
  'byte-relic-009': '/images/nfts/nft3.png',
  'neon-204': '/images/nfts/nft4.png',
  'terra-117': '/images/nfts/nft4.png',
  'pixel-reef-044': '/images/nfts/nft4.png',
  'midnight-frame-026': '/images/nfts/nft4.png',
}

type CheckoutAttempt = {
  userId: string
  quoteId: string
  key: string
  walletId: string
  network: WalletNetwork
  scenario: OrderScenario
}

function CheckoutPage() {
  const navigate = useNavigate()
  const sessionQuery = useSession()
  const cartQuery = useCart()
  const walletsQuery = useWallets()
  const quoteMutation = useCreateQuote()
  const orderMutation = useCreateOrder()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [network, setNetwork] = useState<WalletNetwork>('ethereum')
  const [scenario, setScenario] = useState<OrderScenario>('confirmed')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)
  const [recoveryPending, setRecoveryPending] = useState(true)
  const [recoveryError, setRecoveryError] = useState(false)
  const userId = sessionQuery.data?.user.id

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
    const attempt = readAttempt(userId)

    async function recover() {
      if (!attempt) {
        if (active) setRecoveryPending(false)
        return
      }

      try {
        const order = await getOrderByAttempt(attempt.key)
        if (!active) return
        if (order.status !== 'declined') {
          if (order.status === 'confirmed') clearAttempt(userId!)
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
          return
        }
        clearAttempt(userId!)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          if (active) {
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
        if (!active) return
        setQuote(restoredQuote)
        setSelectedWalletId(attempt.walletId)
        setNetwork(attempt.network)
        setScenario(attempt.scenario)
      } catch (error) {
        if (active) {
          if (error instanceof ApiError && error.status === 404) {
            clearAttempt(userId!)
          } else {
            setRecoveryError(true)
          }
          setStatusMessage(getErrorMessage(error))
          setStatusIsError(true)
        }
      } finally {
        if (active) setRecoveryPending(false)
      }
    }

    void recover()
    return () => { active = false }
  }, [navigate, userId])

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

  async function ensureActiveSession() {
    try {
      const session = await getSession()
      if (!session || session.user.id !== userId) throw new Error('Sessao expirada.')
      return true
    } catch {
      void navigate({ to: '/login', search: { redirect: '/checkout' } })
      return false
    }
  }

  async function handleQuote() {
    setStatusMessage('')
    setStatusIsError(false)
    if (!userId || !(await ensureActiveSession())) return

    try {
      const nextQuote = await quoteMutation.mutateAsync({
        scenario: scenario === 'price-change' ? 'price-change' : undefined,
      })
      setQuote(nextQuote)
      persistAttempt({
        userId,
        quoteId: nextQuote.id,
        walletId: selectedWallet?.id ?? '',
        network,
        scenario,
      })
      setStatusMessage('Cotacao atualizada. Revise os valores antes de confirmar.')
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
      setStatusIsError(true)
      if (error instanceof ApiError && error.status === 401) {
        void navigate({ to: '/login', search: { redirect: '/checkout' } })
      }
    }
  }

  async function handleConfirm() {
    if (!userId || !(await ensureActiveSession())) return
    if (!quote || !selectedWallet) {
      try {
        const nextQuote = await quoteMutation.mutateAsync({})
        setQuote(nextQuote)
        persistAttempt({
          userId,
          quoteId: nextQuote.id,
          walletId: selectedWallet?.id ?? '',
          network,
          scenario,
        })
        setStatusMessage(
          'Cotacao inicial gerada. Clique novamente para confirmar a compra.',
        )
      } catch (error) {
        setStatusMessage(getErrorMessage(error))
        setStatusIsError(true)
      }
      return
    }

    const idempotencyKey = persistAttempt({
      userId,
      quoteId: quote.id,
      walletId: selectedWallet.id,
      network,
      scenario,
    })
    setStatusMessage('')
    setStatusIsError(false)

    try {
      const order = await orderMutation.mutateAsync({
        quoteId: quote.id,
        walletId: selectedWallet.id,
        network,
        idempotencyKey,
        scenario,
      })

      if (order.status === 'confirmed') {
        clearAttempt(userId)
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

      clearAttempt(userId)
      setQuote(null)
      setStatusMessage(
        order.failureReason ??
          'Pagamento recusado. O carrinho foi preservado para nova tentativa.',
      )
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
      setStatusIsError(true)

      if (error instanceof ApiError && error.status === 401) {
        void navigate({ to: '/login', search: { redirect: '/checkout' } })
      } else if (
        error instanceof ApiError &&
        error.status !== undefined &&
        error.code !== 'ORDER_SERVICE_UNAVAILABLE'
      ) {
        setQuote(null)
        clearAttempt(userId)
      }
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-80" />
        </div>
      </section>
    )
  }

  if (recoveryError) {
    return (
      <StateCard
        title="Nao foi possivel recuperar a tentativa"
        description={statusMessage}
        action={<Button type="button" onClick={() => window.location.reload()}>Tentar novamente</Button>}
      />
    )
  }

  if (error) {
    return (
      <StateCard
        title="Nao foi possivel carregar o checkout"
        description={getErrorMessage(error)}
        action={<Button onClick={() => { void cartQuery.refetch(); void walletsQuery.refetch() }}>Tentar novamente</Button>}
      />
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <StateCard
        title="Seu carrinho esta vazio"
        description="Adicione um NFT antes de iniciar o checkout."
        action={
          <Button asChild>
            <Link to="/" search={{ availability: 'all', sort: 'newest', page: 1, scenario: 'normal' }}>
              Voltar ao catalogo
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Checkout
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Confirmar compra
          </h1>
        </div>
        <Badge variant="outline">Sessao ativa</Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card className="rounded-sm border-border/80 bg-card/80 shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-lg">Dados do colecionador</CardTitle>
              <CardDescription>
                Conta autenticada usada para emitir o pedido simulado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 p-5 pt-0 text-sm">
              <span className="font-medium">{sessionQuery.data?.user.name}</span>
              <span className="text-muted-foreground">
                {sessionQuery.data?.user.email}
              </span>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-border/80 bg-card/80 shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <WalletCards className="size-4" aria-hidden="true" />
                Carteira e rede
              </CardTitle>
              <CardDescription>
                Selecione uma carteira simulada conectada para esta compra.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Carteira
                <Select
                  value={selectedWallet?.id ?? ''}
                  onValueChange={(walletId) => {
                    setSelectedWalletId(walletId)
                    setQuote(null)
                    clearAttempt(userId)
                    const wallet = wallets.find(
                      (candidate) => candidate.id === walletId,
                    )

                    if (wallet) {
                      setNetwork(wallet.network)
                    }
                  }}
                >
                  <SelectTrigger aria-label="Carteira do pedido" className="h-10 w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rede
                <Select
                  value={network}
                  onValueChange={(value) => {
                    setNetwork(value as WalletNetwork)
                    setQuote(null)
                    clearAttempt(userId)
                  }}
                >
                  <SelectTrigger aria-label="Rede do pedido" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <div className="md:col-span-2">
                {selectedWallet ? (
                  <div className="space-y-2">
                    <p className="break-all rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {selectedWallet.address}
                    </p>
                    {selectedWallet.status !== 'connected' ? (
                      <p role="alert" className="text-sm text-destructive">
                        Carteira desconectada. Conecte-a em Carteiras para continuar.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Cadastre uma carteira para continuar.
                    </p>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to="/wallets">Cadastrar carteira</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-border/80 bg-card/80 shadow-none">
            <CardHeader className="p-5 pb-3">
              <CardTitle>Cenario deterministico</CardTitle>
              <CardDescription>
                Controle do MSW para validar recuperacao de falhas sem logica no
                componente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Select
                value={scenario}
                onValueChange={(value) => {
                  setScenario(value as OrderScenario)
                  setQuote(null)
                  clearAttempt(userId)
                }}
              >
                <SelectTrigger aria-label="Cenario do pedido" className="h-10 w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Pagamento confirmado</SelectItem>
                  <SelectItem value="pending">Pedido pendente</SelectItem>
                  <SelectItem value="declined">Pagamento recusado</SelectItem>
                  <SelectItem value="timeout-before-create">
                    Timeout antes do pedido
                  </SelectItem>
                  <SelectItem value="timeout-after-create">
                    Timeout apos criar pedido
                  </SelectItem>
                  <SelectItem value="quote-expired">Cotacao expirada</SelectItem>
                  <SelectItem value="price-change">Alteracao de preco</SelectItem>
                  <SelectItem value="sold-out">NFT esgotado</SelectItem>
                  <SelectItem value="session-expired">Sessao expirada</SelectItem>
                  <SelectItem value="error">Erro HTTP 500</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card className="self-start rounded-sm border-border/80 bg-card/80 shadow-none lg:sticky lg:top-24">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-lg">Revisao do pedido</CardTitle>
            <CardDescription>
              A compra usa um snapshot de cotacao valido por 5 minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-sm border border-border/70 p-2">
                  <img src={checkoutImageByNftId[item.nftId] ?? '/images/nfts/nft1.png'} alt="" className="size-14 rounded-sm object-cover" />
                  <div className="grid gap-1">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.editionLabel} - {item.quantity} x {item.unitPriceEth} ETH
                  </span>
                  </div>
                </div>
              ))}
            </div>

            <Separator />
            <Totals
              subtotal={cart.totals.subtotalEth}
              discount={cart.totals.discountEth}
              fee={cart.totals.networkFeeEth}
              total={cart.totals.totalEth}
            />
            {quote ? (
              <p className="flex items-center gap-2 break-all text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Cotacao {quote.id} valida ate {formatDate(quote.expiresAt)}
              </p>
            ) : null}
            {statusMessage ? (
              <p role={statusIsError ? 'alert' : 'status'} className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {statusMessage}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => void handleQuote()}
                disabled={quoteMutation.isPending || orderMutation.isPending}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                {quoteMutation.isPending ? 'Atualizando...' : 'Revalidar cotacao'}
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={!canCheckout || orderMutation.isPending || quoteMutation.isPending}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {orderMutation.isPending ? 'Confirmando...' : 'Confirmar compra'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function Totals({
  subtotal,
  discount,
  fee,
  total,
}: {
  subtotal: string
  discount: string
  fee: string
  total: string
}) {
  return (
    <dl className="grid gap-2 text-sm">
      <TotalRow label="Subtotal" value={`${subtotal} ETH`} />
      <TotalRow label="Desconto" value={`-${discount} ETH`} />
      <TotalRow label="Taxa de rede" value={`${fee} ETH`} />
      <TotalRow label="Total" value={`${total} ETH`} strong />
    </dl>
  )
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? 'text-lg font-semibold' : 'font-medium'}>{value}</dd>
    </div>
  )
}

function StateCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <section className="grid min-h-[55svh] place-items-center">
      <Card className="max-w-xl">
        <CardContent className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {action}
        </CardContent>
      </Card>
    </section>
  )
}

function readAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = localStorage.getItem(checkoutAttemptKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutAttempt
    return parsed.userId === userId && parsed.quoteId && parsed.key ? parsed : null
  } catch {
    return null
  }
}

function persistAttempt(input: Omit<CheckoutAttempt, 'key'>) {
  const existing = readAttempt(input.userId)
  const key = existing?.quoteId === input.quoteId &&
    existing.walletId === input.walletId &&
    existing.network === input.network
    ? existing.key
    : `checkout-${crypto.randomUUID()}`
  localStorage.setItem(checkoutAttemptKey, JSON.stringify({ ...input, key }))
  return key
}

function clearAttempt(userId?: string) {
  if (!userId || readAttempt(userId)) localStorage.removeItem(checkoutAttemptKey)
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
