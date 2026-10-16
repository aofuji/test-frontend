import type { CartItem } from '@/api/types/cart'
import { CartLineItem } from './cart-line-item'

type CartItemListProps = {
  items: CartItem[]
  isBusy: boolean
  onQuantityChange: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

export function CartItemList({ items, isBusy, onQuantityChange, onRemove }: CartItemListProps) {
  return (
    <div className="cart-items">
      <div className="cart-table-heading" aria-hidden="true">
        <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
      </div>
      {items.map((item) => (
        <CartLineItem
          key={item.id}
          item={item}
          isUpdating={isBusy}
          onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </div>
  )
}
