import { Trash2 } from 'lucide-react'
import Decimal from 'decimal.js'

import type { CartItem } from '@/api/types/cart'
import { getNftImage } from '@/features/nft/model/nft-image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type CartLineItemProps = {
  item: CartItem
  isUpdating: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

export function CartLineItem({
  item,
  isUpdating,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  return (
    <Card className={`cart-item${!item.available ? ' cart-item-unavailable' : ''}`}>
      <CardContent className="cart-item-content">
        <div className="cart-item-identity">
          <div className="cart-item-image">
            <img src={getNftImage(item.nftId)} alt={item.name} className="size-full object-cover" />
          </div>
          <div className="cart-item-description">
            <h2>{item.name}</h2>
            <p className="cart-item-edition">Edição: <span className="cart-edition-desktop">{item.editionLabel}</span><span className="cart-edition-mobile">{item.editionLabel.replace(/^edition\s+/i, '')}</span></p>
            <p className="cart-item-provenance">{item.collection} · {item.creator} · {item.chain}</p>
            {!item.available ? <p className="text-destructive">Indisponível</p> : null}
          </div>
        </div>
        <p className="cart-unit-price"><span className="cart-mobile-label">Preço: </span>{item.unitPriceEth} ETH<span className="sr-only"> / unidade</span></p>
        <div className="cart-item-quantity">
          <Button
            type="button"
            size="icon-sm"
            aria-label={`Diminuir quantidade de ${item.name}, ${item.editionLabel}`}
            disabled={isUpdating || item.maxQuantity === 0 || item.quantity <= 1}
            onClick={() => onQuantityChange(item.quantity - 1)}
          >
            −
          </Button>
          <span>{item.quantity}</span>
          <Button
            type="button"
            size="icon-sm"
            aria-label={`Aumentar quantidade de ${item.name}, ${item.editionLabel}`}
            disabled={isUpdating || !item.available || item.quantity >= item.maxQuantity}
            onClick={() => onQuantityChange(item.quantity + 1)}
          >
            +
          </Button>
        </div>
        <p className="cart-line-total"><span className="sr-only">Total do item: </span>{new Decimal(item.unitPriceEth).mul(item.quantity).toString()} ETH</p>
        <Button
          className="cart-item-remove"
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${item.name}, ${item.editionLabel}`}
          disabled={isUpdating}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}
