import { createFileRoute } from '@tanstack/react-router'

function OrderDetailsPage() {
  const { orderId } = Route.useParams()

  return (
    <section className="page-section compact">
      <p className="eyebrow">Pedido</p>
      <h1>Confirmacao do pedido</h1>
      <p>
        Pedido <strong>{orderId}</strong> carregado pela rota parametrizada.
      </p>
    </section>
  )
}

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderDetailsPage,
})
