import { useIsMutating } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent, type ReactNode } from 'react'
import { RotateCcw, ShoppingCart, Trash2 } from 'lucide-react'

import {
  useApplyCartCoupon,
  useCart,
  useCreateQuote,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/api/hooks/useCart'
import { ApiError } from '@/api/http/errors'
import type { CartItem } from '@/api/types/cart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

function CartPage() {
  const cartQuery = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCartCoupon()
  const createQuote = useCreateQuote()
  const navigate = useNavigate()
  const isBusy = useIsMutating({ mutationKey: queryKeys.cart.all }) > 0

  function resetErrors() {
    updateItem.reset()
    removeItem.reset()
    applyCoupon.reset()
    createQuote.reset()
  }
  const [couponCode, setCouponCode] = useState('')
  const mutationError =
    updateItem.error instanceof ApiError
      ? updateItem.error
      : removeItem.error instanceof ApiError
        ? removeItem.error
        : applyCoupon.error instanceof ApiError
          ? applyCoupon.error
          : createQuote.error instanceof ApiError
            ? createQuote.error
            : null

  function handleCouponSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isBusy || !couponCode.trim()) return
    resetErrors()
    applyCoupon.mutate({ couponCode: couponCode.trim() })
  }

  function handleCheckout() {
    if (isBusy) return
    resetErrors()
    createQuote.mutate(
      {},
      {
        onSuccess: () => {
          void navigate({ to: '/checkout' })
        },
      },
    )
  }

  return (
    <section className="space-y-8" aria-busy={cartQuery.isFetching || isBusy}>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Carrinho
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Revise seus NFTs selecionados.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Totais, descontos e taxa de rede sao calculados pela API simulada com
          precisao decimal.
        </p>
      </div>

      {cartQuery.isPending ? <CartSkeleton /> : null}

      {cartQuery.isError ? (
        <StateCard
          role="alert"
          title="Nao foi possivel carregar o carrinho"
          description={cartQuery.error.message}
          action={
            <Button type="button" onClick={() => void cartQuery.refetch()}>
              <RotateCcw aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {cartQuery.isSuccess && cartQuery.data.items.length === 0 ? (
        <StateCard
          title="Carrinho vazio"
          description="Adicione um NFT disponivel para iniciar uma cotacao."
          action={
            <Button asChild>
              <Link
                to="/"
                search={{
                  availability: 'all',
                  sort: 'newest',
                  page: 1,
                  scenario: 'normal',
                }}
              >
                Ver catalogo
              </Link>
            </Button>
          }
        />
      ) : null}

      {cartQuery.isSuccess && cartQuery.data.items.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {cartQuery.data.items.map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                isUpdating={isBusy}
                onQuantityChange={(quantity) => {
                  resetErrors()
                  updateItem.mutate({ itemId: item.id, payload: { quantity } })
                }}
                onRemove={() => {
                  resetErrors()
                  removeItem.mutate(item.id)
                }}
              />
            ))}
          </div>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {mutationError ? (
                <p role="alert" id="cart-mutation-error" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {mutationError.message}
                </p>
              ) : null}

              <form className="space-y-2" onSubmit={handleCouponSubmit}>
                <label className="text-sm font-medium" htmlFor="coupon">
                  Cupom
                </label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    disabled={isBusy}
                    aria-describedby={applyCoupon.error ? "cart-mutation-error" : undefined}
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="SAVE10"
                    aria-invalid={Boolean(applyCoupon.error)}
                  />
                  <Button type="submit" disabled={isBusy || !couponCode.trim()}>
                    Aplicar
                  </Button>
                </div>
                {cartQuery.data.coupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                    <span>
                      {cartQuery.data.coupon.code} · {cartQuery.data.coupon.label}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => {
                        resetErrors()
                        applyCoupon.mutate({ couponCode: null })
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                ) : null}
              </form>

              <Separator />

              <p role="status" className="text-sm text-muted-foreground">
                {isBusy ? 'Atualizando carrinho e totais...' : 'Totais confirmados pela API.'}
              </p>
              <dl className="space-y-3 text-sm">
                <TotalRow label="Subtotal" value={cartQuery.data.totals.subtotalEth} />
                <TotalRow
                  label="Desconto"
                  value={`-${cartQuery.data.totals.discountEth}`}
                />
                <TotalRow
                  label="Taxa de rede"
                  value={cartQuery.data.totals.networkFeeEth}
                />
                <Separator />
                <TotalRow
                  label="Total"
                  value={cartQuery.data.totals.totalEth}
                  strong
                />
              </dl>

              <Button
                className="w-full"
                type="button"
                disabled={isBusy || cartQuery.data.items.some((item) => !item.available)}
                onClick={handleCheckout}
              >
                {createQuote.isPending ? 'Gerando cotacao...' : 'Prosseguir ao checkout'}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

type CartLineItemProps = {
  item: CartItem
  isUpdating: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartLineItem({
  item,
  isUpdating,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  return (
    <Card className={!item.available ? 'border-destructive/50' : undefined}>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
        <div className="nft-art-surface aspect-square rounded-2xl from-zinc-950 via-violet-700 to-rose-300" />
        <div className="min-w-0 space-y-3 break-words">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <Badge variant={item.available ? 'default' : 'destructive'}>
                {item.available ? 'Disponivel' : 'Indisponivel'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.collection} · {item.creator} · {item.chain}
            </p>
          </div>
          <p className="text-sm">
            Edicao: <span className="font-medium">{item.editionLabel}</span>
          </p>
          <p className="font-mono text-sm">{item.unitPriceEth} ETH / unidade</p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <div className="flex items-center rounded-lg border">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Diminuir quantidade de ${item.name}, ${item.editionLabel}`}
              disabled={isUpdating || item.maxQuantity === 0 || item.quantity <= 1}
              onClick={() => onQuantityChange(item.quantity - 1)}
            >
              -
            </Button>
            <span className="min-w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Aumentar quantidade de ${item.name}, ${item.editionLabel}`}
              disabled={isUpdating || !item.available || item.quantity >= item.maxQuantity}
              onClick={() => onQuantityChange(item.quantity + 1)}
            >
              +
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            aria-label={`Remover ${item.name}, ${item.editionLabel}`}
            disabled={isUpdating}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
            Remover
          </Button>
        </div>
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
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? 'font-semibold' : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'font-mono text-lg font-semibold' : 'font-mono'}>
        {value} ETH
      </dd>
    </div>
  )
}

function StateCard({
  title,
  description,
  action,
  role = 'status',
}: {
  role?: 'status' | 'alert'
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card role={role} className="border-dashed">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShoppingCart aria-hidden="true" className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          {action}
        </div>
      </CardContent>
    </Card>
  )
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <span className="sr-only">Carregando carrinho...</span>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72 max-w-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  )
}
