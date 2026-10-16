import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

export function CheckoutMobileHeading() {
  return (
    <div className="checkout-mobile-heading">
      <Link to="/cart" aria-label="Voltar ao carrinho"><ChevronLeft aria-hidden="true" /></Link>
      <h1>Pagamento com carteira</h1>
    </div>
  )
}
