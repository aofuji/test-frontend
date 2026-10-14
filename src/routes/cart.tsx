import { Link, createFileRoute } from '@tanstack/react-router'

function CartPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Carrinho</p>
      <h1>Itens selecionados</h1>
      <p>Placeholder para revisar NFTs antes do checkout.</p>
      <Link to="/checkout" className="button primary">
        Continuar para checkout
      </Link>
    </section>
  )
}

export const Route = createFileRoute('/cart')({
  component: CartPage,
})
