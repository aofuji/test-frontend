import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, Clock3, MailCheck, X } from 'lucide-react'

import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { getNftImage } from '@/features/nft/model/nft-image'
import { useOrder } from '@/api/hooks/useOrders'
import { getOrderByAttempt } from '@/api/orders'
import { capturePrivateSession } from '@/api/privateSession'
import { attemptMatchesOrder, clearAttempt, readAttempt } from '@/features/checkout/model/checkout-attempt'
import { useSession } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { PaymentStatus } from '@/api/types/order'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import './order-receipt.css'

function OrderDetailsPage() {
  const { orderId } = Route.useParams()
  const queryClient = useQueryClient()
  const orderQuery = useOrder(orderId)
  const order = orderQuery.data
  const userId = useSession().data?.user.id

  useEffect(() => {
    if (order?.status !== 'confirmed' || !userId) return
    const attempt = readAttempt(userId)
    if (!attempt || !attemptMatchesOrder(attempt, order)) return
    const session = capturePrivateSession(queryClient)
    let active = true
    void (async () => {
      try {
        // Metadata alone cannot distinguish a later attempt for the same quote.
        const resolved = await getOrderByAttempt(attempt.key)
        if (active && session.isCurrent() && resolved.id === order.id &&
            resolved.status === 'confirmed' && attemptMatchesOrder(attempt, resolved)) {
          clearAttempt(attempt)
        }
      } catch {
        // An uncertain correlation or unavailable storage must not hide a receipt.
      }
    })()
    return () => { active = false }
  }, [order, userId, queryClient])

  if (orderQuery.isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </section>
    )
  }

  if (orderQuery.error || !order) {
    return (
      <section className="grid min-h-[55svh] place-items-center">
        <Card className="max-w-xl">
          <CardContent className="space-y-5 p-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Pedido nao encontrado
            </h1>
            <p className="text-muted-foreground">
              {getErrorMessage(orderQuery.error)}
            </p>
            <Button asChild>
              <Link to="/cart">Voltar ao carrinho</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => void orderQuery.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const ReceiptIcon = order.status === 'confirmed' ? MailCheck : order.status === 'declined' ? CircleAlert : Clock3

  return (
    <section className="order-receipt-page">
      <article className="order-receipt" aria-labelledby="order-receipt-heading">
        <Link to="/" search={defaultCatalogSearch} className="order-receipt-close" aria-label="Fechar recibo">
          <X aria-hidden="true" />
        </Link>
        <header className="order-receipt-header">
          <ReceiptIcon className="order-receipt-icon" aria-hidden="true" />
          <h1 id="order-receipt-heading">
            {order.status === 'confirmed' ? 'Seus NFTs agora estão na sua carteira' : order.status === 'declined' ? 'Não foi possível confirmar sua compra' : 'Seu pedido está aguardando confirmação'}
          </h1>
          <div className="order-receipt-reference">
            <StatusBadge status={order.status} />
            <span>Pedido {order.id}</span>
          </div>
        </header>

        <dl className="order-receipt-strip">
          <InfoRow label="ID da transação" value={order.transactionId ?? 'Não emitida'} />
          <InfoRow label="Data" value={formatDate(order.createdAt)} />
          <InfoRow label="Total" value={`${order.totals.totalEth} ETH`} />
          <InfoRow label="Carteira" value={order.wallet.label} />
        </dl>

        <div className="order-receipt-body">
          <h2 className="order-receipt-section-title">Detalhes da transação</h2>
          <div className="order-receipt-columns" aria-hidden="true">
            <span>NFTs</span><span>Edições</span><span>Subtotal</span>
          </div>
          <div className="order-receipt-items">
            {order.items.map((item) => (
              <div key={item.id} className="order-receipt-item">
                <div className="order-receipt-item-info">
                  <img src={getNftImage(item.nftId)} alt="" />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.editionLabel} · {item.chain}</p>
                    <span className="sr-only">{item.collection}. Unitário: {item.unitPriceEth} ETH.</span>
                  </div>
                </div>
                <span className="order-receipt-quantity"><span className="sr-only">Quantidade: </span>(× {item.quantity})</span>
                <span className="order-receipt-line-total">{item.lineTotalEth} ETH</span>
              </div>
            ))}
          </div>
          {order.failureReason ? <p className="order-receipt-failure" role="alert">{order.failureReason}</p> : null}
          <dl className="order-receipt-totals">
            <InfoRow label="Subtotal" value={`${order.totals.subtotalEth} ETH`} />
            <InfoRow label="Desconto" value={`-${order.totals.discountEth} ETH`} />
            <InfoRow label="Taxa de rede" value={`${order.totals.networkFeeEth} ETH`} />
            <InfoRow label="Total" value={`${order.totals.totalEth} ETH`} strong />
          </dl>
          <footer className="order-receipt-footer">
            <p>Rede: {order.network}.</p>
            <Button asChild>
              <Link to="/" search={defaultCatalogSearch}>Fechar recibo e voltar ao catálogo</Link>
            </Button>
          </footer>
        </div>
      </article>
    </section>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const Icon =
    status === 'confirmed' ? CircleCheck : status === 'declined' ? CircleAlert : Clock3

  return (
    <Badge role="status" aria-live="polite" variant={status === 'declined' ? 'destructive' : 'default'}>
      <Icon className="size-3" aria-hidden="true" />
      {statusLabel(status)}
    </Badge>
  )
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={`order-receipt-info${strong ? ' order-receipt-info-strong' : ''}`}>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  )
}

function statusLabel(status: PaymentStatus) {
  if (status === 'confirmed') {
    return 'Confirmado'
  }

  if (status === 'declined') {
    return 'Recusado'
  }

  return 'Pendente'
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Nao foi possivel carregar este pedido.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => context.auth.ensureSession(location),
  component: OrderDetailsPage,
})
