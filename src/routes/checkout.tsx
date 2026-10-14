import { Link, createFileRoute } from '@tanstack/react-router'

function CheckoutPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Checkout</p>
      <h1>Finalizacao da compra</h1>
      <p>Fluxo de checkout sera implementado em uma etapa posterior.</p>
      <Link to="/orders/$orderId" params={{ orderId: 'preview-order' }}>
        Ver pedido de exemplo
      </Link>
    </section>
  )
}

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})
