import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ImageOff, RotateCcw, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

import { useAddCartItem } from '@/api/hooks/useCart'
import { useNftDetail, useNfts } from '../api/hooks/useNfts'
import type { MockScenario } from '../api/types/nft'
import { ApiError } from '@/api/http/errors'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FavoriteButton } from '@/components/nft/favorite-button'
import { Input } from '@/components/ui/input'

type NftDetailSearch = {
  scenario: MockScenario
}

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const { scenario } = Route.useSearch()
  const nftQuery = useNftDetail(nftId, scenario)
  const collectionQuery = useNfts({ page: 1, pageSize: 5, sort: 'newest', scenario })
  const addCartItem = useAddCartItem()
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeInfoTab, setActiveInfoTab] = useState<'details' | 'reviews'>('details')
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const availableEditions = nftQuery.data?.available
    ? nftQuery.data.editions.filter((edition) => edition.available)
    : []
  const selectedEdition = availableEditions.find((edition) => edition.id === selectedEditionId) ?? availableEditions[0]
  const maxQuantity = selectedEdition?.stock ?? 1
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity
  const addError = addCartItem.error instanceof ApiError ? addCartItem.error : null
  const activeImage = nftQuery.data?.images[selectedImageIndex] ?? nftQuery.data?.images[0]
  const galleryImages = nftQuery.data?.images.length
    ? Array.from({ length: 4 }, (_, index) => nftQuery.data!.images[index % nftQuery.data!.images.length])
    : []

  function markImageUnavailable(src: string) {
    setFailedImages((previous) => new Set(previous).add(src))
  }

  return (
    <section className="space-y-8">
      <Button asChild variant="ghost">
        <Link to="/" search={defaultCatalogSearch}>
          <ArrowLeft aria-hidden="true" />
          Voltar ao catalogo
        </Link>
      </Button>

      {nftQuery.isLoading ? <LoadingSkeleton variant="detail" /> : null}

      {nftQuery.isError ? (
        <Card className="border-dashed">
          <CardContent className="grid min-h-80 place-items-center p-8 text-center">
            <div className="max-w-md space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                NFT
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Nao foi possivel carregar o NFT
              </h1>
              <p className="text-muted-foreground">{nftQuery.error.message}</p>
              <Button
              type="button"
                onClick={() => void nftQuery.refetch()}
              >
                <RotateCcw aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {nftQuery.isSuccess ? (
        <>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
              {galleryImages.length > 0 ? (
              <div role="group" aria-label="Miniaturas do NFT" className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
                {galleryImages.map((image, index) => (
                  <button key={`${image.src}-${index}`} type="button" aria-label={`Mostrar ${image.label.toLowerCase()} de ${nftQuery.data.name}`} aria-pressed={activeImage?.src === image.src && index === selectedImageIndex} onClick={() => setSelectedImageIndex(index % nftQuery.data.images.length)} className="size-16 shrink-0 overflow-hidden rounded-sm border-2 border-border bg-muted outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary sm:size-20">
                    {failedImages.has(image.src) ? <span className="grid size-full place-items-center text-xs text-muted-foreground">Sem imagem</span> : <img src={image.src} alt="" onError={() => markImageUnavailable(image.src)} className="size-full object-cover" />}
                  </button>
                ))}
              </div>
              ) : null}
              <div className="order-1 grid min-h-0 min-w-0 aspect-square w-full overflow-hidden rounded-sm bg-muted shadow-lg sm:order-2">
                {activeImage && !failedImages.has(activeImage.src) ? (
                  <img src={activeImage.src} alt={activeImage.alt} onError={() => markImageUnavailable(activeImage.src)} className="size-full object-cover" />
                ) : (
                  <div role="status" className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                    <ImageOff aria-hidden="true" className="size-8" />Imagem indisponivel para este NFT.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{nftQuery.data.chain}</Badge>
                <Badge variant={nftQuery.data.available ? 'default' : 'secondary'}>
                  {nftQuery.data.available ? 'Disponivel' : 'Vendido'}
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {nftQuery.data.name}
              </h1>
              <p className="font-mono text-xl font-bold text-primary">{nftQuery.data.priceEth} ETH</p>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edição</p>
                <div className="flex flex-wrap gap-2">
                  {nftQuery.data.editions.map((edition) => (
                    <button
                      key={edition.id}
                      type="button"
                      disabled={!edition.available}
                      aria-pressed={selectedEdition?.id === edition.id}
                      onClick={() => { if (edition.available) { setSelectedEditionId(edition.id); setQuantity(1) } }}
                      className="rounded-sm border border-border px-3 py-2 text-xs transition hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {edition.label}
                    </button>
                  ))}
                </div>
            </div>

            <div className="space-y-3 border-t border-border/70 pt-4">
                <div className="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_7rem_auto]">
                  <label className="grid min-w-0 gap-1 text-sm font-medium">Quantidade
                    <Input type="number" min={1} max={maxQuantity} step={1} value={quantity} onChange={(event) => setQuantity(event.target.valueAsNumber)} disabled={!selectedEdition} aria-invalid={!validQuantity} />
                  </label>
                  <Button
                    type="button"
                    disabled={
                      addCartItem.isPending ||
                      !nftQuery.data.available ||
                      !selectedEdition || !validQuantity
                    }
                    onClick={() => {
                      if (!selectedEdition || !validQuantity) {
                        return
                      }

                      addCartItem.mutate({
                        nftId: nftQuery.data.id,
                        editionId: selectedEdition.id,
                        quantity,
                      })
                    }}
                  >
                    <ShoppingCart aria-hidden="true" />
                    {addCartItem.isPending ? 'Adicionando...' : 'Comprar'}
                  </Button>
                </div>
                {selectedEdition ? <p className="text-xs text-muted-foreground">Disponibilidade desta edicao: {maxQuantity}.</p> : null}
                {!validQuantity && selectedEdition ? <p role="alert" className="text-sm text-destructive">Escolha uma quantidade inteira entre 1 e {maxQuantity}.</p> : null}
                {addCartItem.isSuccess ? (
                  <p role="status" className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
                    NFT adicionado ao carrinho.
                  </p>
                ) : null}
                {addError ? (
                  <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    {addError.message}
                  </p>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link to="/cart">Ver carrinho</Link>
                </Button>
                <div className="pt-1">
                  <FavoriteButton nftId={nftQuery.data.id} name={nftQuery.data.name} />
                </div>
            </div>
          </div>
        </div>
        <section aria-labelledby="description-heading" className="grid gap-5 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Sobre a obra</p>
            <h2 id="description-heading" className="text-xl font-bold">Descrição</h2>
            <p className="max-w-3xl leading-7 text-muted-foreground">{nftQuery.data.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 self-start rounded-sm border border-border/70 bg-card/50 p-4">
            <MetadataItem label="Criador" value={nftQuery.data.creator} />
            <MetadataItem label="Coleção" value={nftQuery.data.collection} />
            <MetadataItem label="Rede" value={nftQuery.data.chain} />
            <MetadataItem label="Disponibilidade" value={nftQuery.data.available ? 'Disponível' : 'Vendido'} />
          </div>
        </section>
        <section aria-label="Informações do NFT" className="border-t border-border pt-6">
          <div role="tablist" aria-label="Detalhes e avaliações" className="flex gap-6 border-b border-border text-sm font-semibold">
            <button type="button" role="tab" aria-selected={activeInfoTab === 'details'} onClick={() => setActiveInfoTab('details')} className={activeInfoTab === 'details' ? 'border-b-2 border-primary pb-3 text-primary' : 'border-b-2 border-transparent pb-3 text-muted-foreground'}>Detalhes do NFT</button>
            <button type="button" role="tab" aria-selected={activeInfoTab === 'reviews'} onClick={() => setActiveInfoTab('reviews')} className={activeInfoTab === 'reviews' ? 'border-b-2 border-primary pb-3 text-primary' : 'border-b-2 border-transparent pb-3 text-muted-foreground'}>Avaliações de colecionadores</button>
          </div>
          <div className="pt-5 text-sm text-muted-foreground">
            {activeInfoTab === 'details' ? <p>Token, coleção, rede e disponibilidade estão descritos acima com os dados fornecidos pela API.</p> : <p>Nenhuma avaliação de colecionador disponível.</p>}
          </div>
        </section>
        <section aria-labelledby="collection-heading" className="space-y-5 border-t border-border pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Coleção</p>
              <h2 id="collection-heading" className="mt-1 text-2xl font-bold">Mais nesta coleção</h2>
            </div>
          </div>
          {collectionQuery.isLoading ? <LoadingSkeleton count={5} /> : null}
          {collectionQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar outros NFTs desta coleção.</p> : null}
          {collectionQuery.data?.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {collectionQuery.data.items.map((item) => (
                <Link key={item.id} to="/nft/$nftId" params={{ nftId: item.id }} search={{ scenario }} className="group min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="aspect-square overflow-hidden rounded-sm bg-muted">
                    {item.images[0] ? <img src={item.images[0].src} alt={item.images[0].alt} className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-xs text-muted-foreground">Imagem indisponível</span>}
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold">{item.name}</p>
                  <p className="mt-1 font-mono text-xs text-primary">{item.priceEth} ETH</p>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
        </>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: (search: Record<string, unknown>): NftDetailSearch => ({
    scenario: getScenario(search.scenario),
  }),
  component: NftDetailsPage,
})

function getScenario(value: unknown): MockScenario {
  if (value === 'latency' || value === 'error' || value === 'empty') {
    return value
  }

  return 'normal'
}

const defaultCatalogSearch = {
  availability: 'all',
  sort: 'newest',
  page: 1,
  scenario: 'normal',
} as const

type MetadataItemProps = {
  label: string
  value: string
}

function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  )
}
