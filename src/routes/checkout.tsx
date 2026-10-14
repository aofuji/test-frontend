import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

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

const checkoutAttemptKey = 'nft-marketplace.checkout-attempt.v1'

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

  const wallets = walletsQuery.data ?? []
  const selectedWallet =
    wallets.find((wallet) => wallet.id === selectedWalletId) ??
    wallets.find((wallet) => wallet.isDefault) ??
    wallets[0]
  const cart = cartQuery.data
  const isLoading = cartQuery.isLoading || walletsQuery.isLoading
  const error = cartQuery.error ?? walletsQuery.error
  const canCheckout = Boolean(cart?.items.length && selectedWallet)

  async function handleQuote() {
    setStatusMessage('')

    try {
      const nextQuote = await quoteMutation.mutateAsync({
        scenario: scenario === 'price-change' ? 'price-change' : undefined,
      })
      setQuote(nextQuote)
      persistAttempt(nextQuote.id)
      setStatusMessage('Cotacao atualizada. Revise os valores antes de confirmar.')
    } catch (error) {
      setStatusMessage(getErrorMessage(error))
    }
  }

  async function handleConfirm() {
    if (!quote || !selectedWallet) {
      try {
        const nextQuote = await quoteMutation.mutateAsync({})
        setQuote(nextQuote)
        persistAttempt(nextQuote.id)
        setStatusMessage(
          'Cotacao inicial gerada. Clique novamente para confirmar a compra.',
        )
      } catch (error) {
        setStatusMessage(getErrorMessage(error))
      }
      return
    }

    const idempotencyKey = getOrCreateAttempt(quote.id)
    setStatusMessage('')

    try {
      const order = await orderMutation.mutateAsync({
        quoteId: quote.id,
        walletId: selectedWallet.id,
        network,
        idempotencyKey,
        scenario,
      })

      if (order.status === 'confirmed') {
        clearAttempt()
        await navigate({
          to: '/orders/$orderId',
          params: { orderId: order.id },
        })
        return
      }

      setStatusMessage(
        order.failureReason ??
          'Pagamento recusado. O carrinho foi preservado para nova tentativa.',
      )
    } catch (error) {
      setStatusMessage(getErrorMessage(error))

      if (error instanceof ApiError && error.code !== 'ORDER_SERVICE_UNAVAILABLE') {
        setQuote(null)
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

  if (error) {
    return (
      <StateCard
        title="Nao foi possivel carregar o checkout"
        description={getErrorMessage(error)}
        action={<Button onClick={() => void cartQuery.refetch()}>Tentar novamente</Button>}
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
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Checkout
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Confirmar compra
          </h1>
        </div>
        <Badge variant="outline">Sessao ativa</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Dados do colecionador</CardTitle>
              <CardDescription>
                Conta autenticada usada para emitir o pedido simulado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <span className="font-medium">{sessionQuery.data?.user.name}</span>
              <span className="text-muted-foreground">
                {sessionQuery.data?.user.email}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="size-4" aria-hidden="true" />
                Carteira e rede
              </CardTitle>
              <CardDescription>
                Selecione uma carteira simulada conectada para esta compra.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Carteira
                <Select
                  value={selectedWallet?.id ?? ''}
                  onValueChange={(walletId) => {
                    setSelectedWalletId(walletId)
                    const wallet = wallets.find(
                      (candidate) => candidate.id === walletId,
                    )

                    if (wallet) {
                      setNetwork(wallet.network)
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
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
                  onValueChange={(value) => setNetwork(value as WalletNetwork)}
                >
                  <SelectTrigger className="h-10 w-full">
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
                  <p className="break-all rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    {selectedWallet.address}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Cadastre uma carteira para continuar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cenario deterministico</CardTitle>
              <CardDescription>
                Controle do MSW para validar recuperacao de falhas sem logica no
                componente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={scenario}
                onValueChange={(value) => setScenario(value as OrderScenario)}
              >
                <SelectTrigger className="h-10 w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Pagamento confirmado</SelectItem>
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

        <Card>
          <CardHeader>
            <CardTitle>Revisao do pedido</CardTitle>
            <CardDescription>
              A compra usa um snapshot de cotacao valido por 5 minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="grid gap-1 rounded-lg border p-3">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.editionLabel} - {item.quantity} x {item.unitPriceEth} ETH
                  </span>
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
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Cotacao {quote.id} valida ate {formatDate(quote.expiresAt)}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {statusMessage}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => void handleQuote()}
                disabled={quoteMutation.isPending}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                {quoteMutation.isPending ? 'Atualizando...' : 'Revalidar cotacao'}
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={!canCheckout || orderMutation.isPending}
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

function getOrCreateAttempt(quoteId: string) {
  const existing = localStorage.getItem(checkoutAttemptKey)

  if (existing) {
    const parsed = JSON.parse(existing) as { quoteId: string; key: string }

    if (parsed.quoteId === quoteId) {
      return parsed.key
    }
  }

  return persistAttempt(quoteId)
}

function persistAttempt(quoteId: string) {
  const key = `checkout-${crypto.randomUUID()}`
  localStorage.setItem(checkoutAttemptKey, JSON.stringify({ quoteId, key }))
  return key
}

function clearAttempt() {
  localStorage.removeItem(checkoutAttemptKey)
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
