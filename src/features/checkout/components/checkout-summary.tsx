import Decimal from 'decimal.js'
import { Link } from '@tanstack/react-router'
import { ShieldCheck, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Cart } from '@/api/types/cart'
import type { Wallet, WalletNetwork } from '@/api/types/wallet'
import { getNftImage } from '@/features/nft/model/nft-image'

type CheckoutSummaryProps = {
  cart: Cart
  selectedWallet: Wallet | undefined
  network: WalletNetwork
  reviewOpen: boolean
  onToggleReview: () => void
  quoteExpiration: string | null
  statusMessage: string
  statusIsError: boolean
  actions: ReactNode
}

export function CheckoutSummary({ cart, selectedWallet, network, reviewOpen, onToggleReview, quoteExpiration, statusMessage, statusIsError, actions }: CheckoutSummaryProps) {
  return (
    <section className="checkout-summary" aria-labelledby="checkout-summary-heading">
      <button type="button" className="checkout-mobile-review-toggle" aria-expanded={reviewOpen} aria-controls="checkout-review-items" onClick={onToggleReview}>{reviewOpen ? 'Ocultar resumo do pedido' : 'Revisar pedido'}</button>
      <h2 id="checkout-summary-heading">Seus NFTs</h2>
      <div className="checkout-summary-columns" aria-hidden="true"><span>NFTs</span><span>Subtotal</span></div>
      <div id="checkout-review-items" className="checkout-nfts">
        {cart.items.map((item) => (
          <div key={item.id} className="checkout-nft">
            <img src={getNftImage(item.nftId)} alt="" />
            <div className="checkout-nft-info">
              <h3>{item.name}</h3>
              <p>{item.editionLabel} · {item.quantity} × {item.unitPriceEth} ETH</p>
            </div>
            <p className="checkout-nft-total">{new Decimal(item.unitPriceEth).mul(item.quantity).toString()} ETH</p>
          </div>
        ))}
      </div>
      {cart.coupon ? <p className="checkout-coupon">Cupom aplicado: {cart.coupon.code} · {cart.coupon.label}</p> : null}
      <Totals
        subtotal={cart.totals.subtotalEth}
        discount={cart.totals.discountEth}
        fee={cart.totals.networkFeeEth}
        total={cart.totals.totalEth}
      />
      <div className="checkout-selected-wallet">
        <h2>Carteira e rede</h2>
        {selectedWallet ? (
          <div className="checkout-wallet-card">
            <WalletCards aria-hidden="true" />
            <div>
              <p>{selectedWallet.label}</p>
              <span>{network} · {selectedWallet.status === 'connected' ? 'Conectada' : 'Desconectada'}</span>
            </div>
          </div>
        ) : <Link to="/wallets">Cadastrar carteira</Link>}
      </div>
      {quoteExpiration ? (
        <p className="checkout-quote">
          <ShieldCheck aria-hidden="true" />
          Cotação válida até {quoteExpiration}
        </p>
      ) : null}
      {statusMessage ? (
        <p role={statusIsError ? 'alert' : 'status'} className={`checkout-feedback${statusIsError ? ' checkout-feedback-error' : ''}`}>
          {statusMessage}
        </p>
      ) : null}
      {actions}
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
    <dl className="checkout-totals">
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
    <div className={strong ? 'checkout-total-final' : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
