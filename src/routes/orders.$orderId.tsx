import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CircleAlert, CircleCheck, Clock3 } from 'lucide-react'

import { useOrder } from '@/api/hooks/useOrders'
import { useSession } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { PaymentStatus } from '@/api/types/order'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

function OrderDetailsPage() {
  const { orderId } = Route.useParams()
  const orderQuery = useOrder(orderId)
  const order = orderQuery.data
  const userId = useSession().data?.user.id

  useEffect(() => {
    if (order?.status !== 'confirmed' || !userId) return
    try {
      const raw = localStorage.getItem('nft-marketplace.checkout-attempt.v1')
      if (!raw) return
      const attempt = JSON.parse(raw) as { userId?: string; quoteId?: string }
      if (attempt.userId === userId && attempt.quoteId === order.quoteId) {
        localStorage.removeItem('nft-marketplace.checkout-attempt.v1')
      }
    } catch {
      // A malformed local attempt must not hide a valid receipt.
    }
  }, [order?.status, order?.quoteId, userId])

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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Pedido
          </p>
          <h1 className="break-all text-4xl font-semibold tracking-tight">
            {order.id}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>NFTs comprados</CardTitle>
            <CardDescription>
              Snapshot imutavel gerado no momento da compra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {item.collection} - {item.editionLabel}
                    </p>
                  </div>
                  <Badge variant="outline">{item.chain}</Badge>
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>Quantidade: {item.quantity}</span>
                  <span>Unitario: {item.unitPriceEth} ETH</span>
                  <span>Total: {item.lineTotalEth} ETH</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recibo</CardTitle>
            <CardDescription>
              Confirmacao exibida apenas a partir do estado retornado pela API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <InfoRow label="Pagamento" value={statusLabel(order.status)} />
              <InfoRow
                label="Transacao"
                value={order.transactionId ?? 'Nao emitida'}
              />
              <InfoRow label="Carteira" value={order.wallet.label} />
              <InfoRow label="Rede" value={order.network} />
              <InfoRow label="Criado em" value={formatDate(order.createdAt)} />
            </div>
            {order.failureReason ? (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {order.failureReason}
              </p>
            ) : null}
            <Separator />
            <dl className="grid gap-2 text-sm">
              <InfoRow label="Subtotal" value={`${order.totals.subtotalEth} ETH`} />
              <InfoRow
                label="Desconto"
                value={`-${order.totals.discountEth} ETH`}
              />
              <InfoRow
                label="Taxa de rede"
                value={`${order.totals.networkFeeEth} ETH`}
              />
              <InfoRow label="Total" value={`${order.totals.totalEth} ETH`} strong />
            </dl>
            <Button asChild variant="outline" className="w-full">
              <Link to="/" search={{ availability: 'all', sort: 'newest', page: 1, scenario: 'normal' }}>
                Voltar ao catalogo
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
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
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? 'text-lg font-semibold' : 'break-all font-medium'}>
        {value}
      </dd>
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
