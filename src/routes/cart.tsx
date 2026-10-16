import { useIsMutating } from '@tanstack/react-query'
import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { queryKeys } from '@/api/queryKeys'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { ChevronLeft, RotateCcw } from 'lucide-react'

import './cart.css'

import {
  useApplyCartCoupon,
  useCart,
  useCreateQuote,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/api/hooks/useCart'
import { ApiError } from '@/api/http/errors'
import { useNfts } from '@/api/hooks/useNfts'
import { Button } from '@/components/ui/button'
import { CartItemList } from '@/features/cart/components/cart-item-list'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { CartCoupon } from '@/features/cart/components/cart-coupon'
import { CartRecommendations } from '@/features/cart/components/cart-recommendations'
import { CartSkeleton, CartStateCard } from '@/features/cart/components/cart-states'

function CartPage() {
  const cartQuery = useCart()
  const [relatedPage, setRelatedPage] = useState(1)
  const relatedQuery = useNfts({ page: relatedPage, pageSize: 5, sort: 'newest' })
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

  function handleQuantityChange(itemId: string, quantity: number) {
    resetErrors()
    updateItem.mutate({ itemId, payload: { quantity } })
  }

  function handleRemoveItem(itemId: string) {
    resetErrors()
    removeItem.mutate(itemId)
  }

  function handleRemoveCoupon() {
    resetErrors()
    applyCoupon.mutate({ couponCode: null })
  }

  return (
    <section className="kurio-cart" aria-busy={cartQuery.isFetching || isBusy}>
      <nav className="cart-breadcrumb" aria-label="Caminho de navegação">
        <Link to="/" search={defaultCatalogSearch}>Início</Link>
        <span aria-hidden="true">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo">Mercado</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <Link to="/" search={defaultCatalogSearch} hash="catalogo" aria-label="Voltar ao catálogo" className="cart-mobile-back"><ChevronLeft aria-hidden="true" /></Link>
      <h1 className="cart-title">Carrinho de NFTs</h1>

      {cartQuery.isPending ? <CartSkeleton /> : null}

      {cartQuery.isError ? (
        <CartStateCard
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
        <CartStateCard
          title="Carrinho vazio"
          description="Adicione um NFT disponivel para iniciar uma cotacao."
          action={
            <Button asChild>
              <Link
                to="/"
                search={defaultCatalogSearch}
              >
                Ver catalogo
              </Link>
            </Button>
          }
        />
      ) : null}

      {cartQuery.isSuccess && cartQuery.data.items.length > 0 ? (
        <>
          <div className="cart-layout">
            <CartItemList
              items={cartQuery.data.items}
              isBusy={isBusy}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
            />

            <CartSummary
              totals={cartQuery.data.totals}
              error={mutationError}
              isBusy={isBusy}
              checkoutDisabled={isBusy || cartQuery.data.items.some((item) => !item.available)}
              isCreatingQuote={createQuote.isPending}
              onCheckout={handleCheckout}
              coupon={
                <CartCoupon
                  coupon={cartQuery.data.coupon}
                  couponCode={couponCode}
                  isBusy={isBusy}
                  hasError={Boolean(applyCoupon.error)}
                  onCodeChange={setCouponCode}
                  onSubmit={handleCouponSubmit}
                  onRemove={handleRemoveCoupon}
                />
              }
            />
          </div>
          <CartRecommendations
            data={relatedQuery.data}
            isPending={relatedQuery.isPending}
            isError={relatedQuery.isError}
            isFetching={relatedQuery.isFetching}
            onRetry={() => void relatedQuery.refetch()}
            onPageChange={setRelatedPage}
          />
        </>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/cart')({
  component: CartPage,
})
