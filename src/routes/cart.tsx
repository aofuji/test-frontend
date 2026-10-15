import { useIsMutating } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent, type ReactNode } from 'react'
import { RotateCcw, ShoppingCart, Trash2 } from 'lucide-react'
import Decimal from 'decimal.js'

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
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import type { CartItem } from '@/api/types/cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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

  return (
    <section className="kurio-cart" aria-busy={cartQuery.isFetching || isBusy}>
      <nav className="cart-breadcrumb" aria-label="Caminho de navegação">
        <Link to="/" search={catalogSearch}>Início</Link>
        <span aria-hidden="true">/</span>
        <Link to="/" search={catalogSearch} hash="catalogo">Mercado</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="cart-title">Carrinho de NFTs</h1>

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
        <>
        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-table-heading" aria-hidden="true">
              <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
            </div>
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

          <Card className="cart-summary" role="region" aria-label="Resumo do pedido">
            <CardHeader className="cart-summary-heading">
              <CardTitle>Resumo da carteira</CardTitle>
            </CardHeader>
            <CardContent className="cart-summary-content">
              {mutationError ? (
                <p role="alert" id="cart-mutation-error" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {mutationError.message}
                </p>
              ) : null}

              <form className="cart-coupon" onSubmit={handleCouponSubmit}>
                <label className="text-sm font-medium" htmlFor="coupon">
                  Código promocional
                </label>
                <div className="cart-coupon-input">
                  <Input
                    id="coupon"
                    aria-label="Cupom"
                    disabled={isBusy}
                    aria-describedby={applyCoupon.error ? "cart-mutation-error" : undefined}
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Digite o código promocional..."
                    aria-invalid={Boolean(applyCoupon.error)}
                  />
                  <Button type="submit" disabled={isBusy || !couponCode.trim()}>
                    Aplicar
                  </Button>
                </div>
                {cartQuery.data.coupon ? (
                  <div className="cart-applied-coupon">
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

              <p role="status" className="sr-only">
                {isBusy ? 'Atualizando carrinho e totais...' : 'Totais confirmados pela API.'}
              </p>
              <dl className="cart-totals">
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
                className="cart-checkout"
                type="button"
                disabled={isBusy || cartQuery.data.items.some((item) => !item.available)}
                onClick={handleCheckout}
              >
                {createQuote.isPending ? 'Gerando cotacao...' : 'Prosseguir ao checkout'}
              </Button>
              <Link to="/" search={catalogSearch} hash="catalogo" className="cart-continue">Continuar explorando</Link>
            </CardContent>
          </Card>
        </div>
        <section className="cart-related" aria-labelledby="cart-related-heading" aria-busy={relatedQuery.isFetching}>
          <h2 id="cart-related-heading">Colecionadores também viram</h2>
          {relatedQuery.isPending ? <LoadingSkeleton count={5} className="cart-related-grid" /> : null}
          {relatedQuery.isError ? (
            <div role="alert">
              <p>Não foi possível carregar os NFTs do catálogo.</p>
              <Button type="button" variant="link" onClick={() => void relatedQuery.refetch()}>Tentar novamente</Button>
            </div>
          ) : null}
          {relatedQuery.data ? (
            <>
              <div id="cart-related-items" className="cart-related-grid">
                {relatedQuery.data.items.map((nft) => (
                  <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario: 'normal' }}>
                    <div className="cart-related-image">
                      {nft.images[0] ? <img src={nft.images[0].src} alt={nft.images[0].alt} loading="lazy" /> : <span>Imagem indisponível</span>}
                    </div>
                    <p>{nft.name}</p>
                    <p className="cart-related-price">{nft.priceEth} ETH</p>
                  </Link>
                ))}
              </div>
              {relatedQuery.data.items.length === 0 ? <p>Nenhum NFT disponível no catálogo.</p> : null}
              {relatedQuery.data.totalPages > 1 ? (
                <nav className="cart-related-pages" aria-label="Páginas de Colecionadores também viram">
                  {Array.from({ length: relatedQuery.data.totalPages }, (_, index) => (
                    <button key={index} type="button" aria-label={`Ver página ${index + 1} de NFTs`} aria-controls="cart-related-items" aria-current={relatedQuery.data.page === index + 1 ? 'page' : undefined} onClick={() => setRelatedPage(index + 1)} />
                  ))}
                </nav>
              ) : null}
            </>
          ) : null}
        </section>
        </>
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

const cartImageByNftId: Record<string, string> = {
  'aurora-001': '/images/nfts/nft1.png',
  'block-bloom-155': '/images/nfts/nft1.png',
  'solar-thread-019': '/images/nfts/nft2.png',
  'glass-house-071': '/images/nfts/nft2.png',
  'mono-mask-008': '/images/nfts/nft2.png',
  'orbit-512': '/images/nfts/nft3.png',
  'vault-echo-300': '/images/nfts/nft3.png',
  'byte-relic-009': '/images/nfts/nft3.png',
  'neon-204': '/images/nfts/nft4.png',
  'terra-117': '/images/nfts/nft4.png',
  'pixel-reef-044': '/images/nfts/nft4.png',
  'midnight-frame-026': '/images/nfts/nft4.png',
}

function CartLineItem({
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
            <img src={cartImageByNftId[item.nftId] ?? '/images/nfts/nft1.png'} alt={item.name} className="size-full object-cover" />
          </div>
          <div className="cart-item-description">
            <h2>{item.name}</h2>
            <p className="cart-item-edition">Edição: {item.editionLabel}</p>
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
    <div role="status" aria-label="Carregando carrinho" className="cart-layout cart-skeleton">
      <span className="sr-only">Carregando carrinho...</span>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="cart-item">
            <CardContent className="cart-skeleton-item">
              <Skeleton className="cart-skeleton-image" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-56 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
              <Skeleton className="h-10 w-20 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 rounded-sm" />
    </div>
  )
}

const catalogSearch = {
  availability: 'all',
  sort: 'newest',
  page: 1,
  scenario: 'normal',
} as const
