import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'

function OrderDetailsPage() {
  const { orderId } = Route.useParams()

  return (
    <section className="grid min-h-[55svh] place-items-center">
      <Card className="max-w-xl">
        <CardContent className="space-y-3 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Pedido
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Confirmacao do pedido
          </h1>
          <p className="text-muted-foreground">
            Pedido <strong>{orderId}</strong> carregado pela rota parametrizada.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => context.auth.ensureSession(location),
  component: OrderDetailsPage,
})
