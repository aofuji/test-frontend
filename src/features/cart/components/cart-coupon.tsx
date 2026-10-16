import type { FormEventHandler } from 'react'

import type { AppliedCoupon } from '@/api/types/cart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CartCouponProps = {
  coupon: AppliedCoupon | null
  couponCode: string
  isBusy: boolean
  hasError: boolean
  onCodeChange: (code: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onRemove: () => void
}

export function CartCoupon({ coupon, couponCode, isBusy, hasError, onCodeChange, onSubmit, onRemove }: CartCouponProps) {
  return (
    <form className="cart-coupon" onSubmit={onSubmit}>
      <label className="text-sm font-medium" htmlFor="coupon">
        Código promocional
      </label>
      <div className="cart-coupon-input">
        <Input
          id="coupon"
          aria-label="Cupom"
          disabled={isBusy}
          aria-describedby={hasError ? "cart-mutation-error" : undefined}
          value={couponCode}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(hasError)}
        />
        <Button type="submit" disabled={isBusy || !couponCode.trim()}>
          Aplicar
        </Button>
      </div>
      {coupon ? (
        <div className="cart-applied-coupon">
          <span>
            {coupon.code} · {coupon.label}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={onRemove}
          >
            Remover
          </Button>
        </div>
      ) : null}
    </form>
  )
}
