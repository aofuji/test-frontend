import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import type { CartTotals } from '@/api/types/cart'
import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type CartSummaryProps = {
  totals: CartTotals
  error: { message: string } | null
  coupon: ReactNode
  isBusy: boolean
  checkoutDisabled: boolean
  isCreatingQuote: boolean
  onCheckout: () => void
}

export function CartSummary({ totals, error, coupon, isBusy, checkoutDisabled, isCreatingQuote, onCheckout }: CartSummaryProps) {
  return (
    <Card className="cart-summary" role="region" aria-label="Resumo do pedido">
      <CardHeader className="cart-summary-heading">
        <CardTitle>Resumo da carteira</CardTitle>
      </CardHeader>
      <CardContent className="cart-summary-content">
        {error ? (
          <p role="alert" id="cart-mutation-error" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {coupon}

        <p role="status" className="sr-only">
          {isBusy ? 'Atualizando carrinho e totais...' : 'Totais confirmados pela API.'}
        </p>
        <dl className="cart-totals">
          <TotalRow label="Subtotal" value={totals.subtotalEth} />
          <TotalRow
            label="Desconto"
            value={`-${totals.discountEth}`}
          />
          <TotalRow
            label="Taxa de rede"
            value={totals.networkFeeEth}
          />
          <Separator />
          <TotalRow
            label="Total"
            value={totals.totalEth}
            strong
          />
        </dl>

        <Button
          className="cart-checkout"
          type="button"
          disabled={checkoutDisabled}
          onClick={onCheckout}
        >
          {isCreatingQuote ? 'Gerando cotacao...' : <><span className="cart-checkout-desktop-label">Prosseguir ao checkout</span><span className="cart-checkout-mobile-label">Continuar e finalizar</span></>}
        </Button>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="cart-continue">Continuar explorando</Link>
      </CardContent>
    </Card>
  )
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={strong ? 'cart-total-final' : undefined}>
      <dt>{label}</dt>
      <dd>
        {value} ETH
      </dd>
    </div>
  )
}
