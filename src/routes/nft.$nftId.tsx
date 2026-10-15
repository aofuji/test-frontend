import { Link, createFileRoute } from '@tanstack/react-router'
import { ImageOff, Minus, Plus, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'

import { useAddCartItem } from '@/api/hooks/useCart'
import { useNftDetail, useNfts } from '../api/hooks/useNfts'
import type { MockScenario } from '../api/types/nft'
import { ApiError } from '@/api/http/errors'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
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
  const [collectionPage, setCollectionPage] = useState(1)
  const collectionQuery = useNfts({ page: collectionPage, pageSize: 5, sort: 'newest', scenario })
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
  const galleryImages = (nftQuery.data?.images ?? []).filter(
    (image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index,
  )
  const activeImage = galleryImages[selectedImageIndex] ?? galleryImages[0]

  function markImageUnavailable(src: string) {
    setFailedImages((previous) => new Set(previous).add(src))
  }

  return (
    <section className="nft-detail">
      <nav aria-label="Caminho de navegação" className="nft-breadcrumb">
        <Link to="/" search={defaultCatalogSearch}>Início</Link>
        <span aria-hidden="true">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo">Mercado</Link>
      </nav>

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
        <div className="nft-product">
          <div className="nft-gallery">
            {galleryImages.length > 0 ? (
              <div role="group" aria-label="Miniaturas do NFT" className="nft-thumbnails">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.src}-${index}`}
                    type="button"
                    aria-label={`Mostrar ${image.label.toLowerCase()} de ${nftQuery.data.name}`}
                    aria-pressed={image === activeImage}
                    onClick={() => setSelectedImageIndex(index)}
                    className="nft-thumbnail"
                  >
                    {failedImages.has(image.src) ? <span className="grid size-full place-items-center text-xs text-muted-foreground">Sem imagem</span> : <img src={image.src} alt="" onError={() => markImageUnavailable(image.src)} className="size-full object-cover" />}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="nft-main-image">
              {activeImage && !failedImages.has(activeImage.src) ? (
                <img src={activeImage.src} alt={activeImage.alt} onError={() => markImageUnavailable(activeImage.src)} className="size-full object-cover" />
              ) : (
                <div role="status" className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <ImageOff aria-hidden="true" className="size-8" />Imagem indisponivel para este NFT.
                </div>
              )}
            </div>
          </div>
          <div className="nft-summary">
            <h1>{nftQuery.data.name}</h1>
            <div className="nft-price-row">
              <p className="nft-price">{nftQuery.data.priceEth} ETH</p>
              <span className="sr-only">{nftQuery.data.available ? 'Disponível' : 'Vendido'}</span>
              <button
                type="button"
                className="nft-rating"
                aria-label="Ver avaliações de colecionadores"
                onClick={() => {
                  setActiveInfoTab('reviews')
                  document.getElementById('nft-reviews-tab')?.focus()
                }}
              >
                <RatingStars />
                <span>Sem avaliações disponíveis</span>
              </button>
            </div>
            <section aria-labelledby="description-heading" className="nft-description">
              <h2 id="description-heading">Sobre este NFT:</h2>
              <p>{nftQuery.data.description}</p>
            </section>
            <div className="nft-editions">
              <p>Edição:</p>
              <div className="flex flex-wrap gap-1.5">
                {nftQuery.data.editions.map((edition) => (
                  <button
                    key={edition.id}
                    type="button"
                    disabled={!edition.available}
                    aria-pressed={selectedEdition?.id === edition.id}
                    onClick={() => { if (edition.available) { setSelectedEditionId(edition.id); setQuantity(1) } }}
                    className="nft-edition"
                  >
                    {editionChipLabel(edition.label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="nft-purchase-row">
              <div className="nft-quantity">
                <Button type="button" size="icon" aria-label="Diminuir quantidade" disabled={!selectedEdition || !Number.isFinite(quantity) || quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus aria-hidden="true" /></Button>
                <label className="min-w-0">
                  <span className="sr-only">Quantidade</span>
                  <Input type="number" min={1} max={maxQuantity} step={1} value={quantity} onChange={(event) => setQuantity(event.target.valueAsNumber)} disabled={!selectedEdition} aria-invalid={!validQuantity} />
                </label>
                <Button type="button" size="icon" aria-label="Aumentar quantidade" disabled={!selectedEdition || !Number.isFinite(quantity) || quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}><Plus aria-hidden="true" /></Button>
              </div>
              <div className="nft-purchase-buttons">
                  <Button
                    type="button"
                    className="nft-buy"
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
                    {addCartItem.isPending ? 'Adicionando...' : 'COMPRAR'}
                  </Button>
                <FavoriteButton nftId={nftQuery.data.id} name={nftQuery.data.name} showLabel />
              </div>
            </div>
            <div className="nft-purchase-feedback">
              {selectedEdition ? <p>Disponibilidade desta edição: {maxQuantity}.</p> : null}
              {!validQuantity && selectedEdition ? <p role="alert" className="text-destructive">Escolha uma quantidade inteira entre 1 e {maxQuantity}.</p> : null}
              {addCartItem.isSuccess ? <p role="status" className="text-primary">NFT adicionado ao carrinho.</p> : null}
              {addError ? <p role="alert" className="text-destructive">{addError.message}</p> : null}
            </div>
            <dl className="nft-metadata">
              <MetadataItem label="ID do NFT" value={nftQuery.data.id} />
              <MetadataItem label="Coleção" value={nftQuery.data.collection} />
              <MetadataItem label="Criador" value={nftQuery.data.creator} />
              <MetadataItem label="Categoria" value={nftQuery.data.category} />
            </dl>
          </div>
        </div>
        <section aria-label="Informações do NFT" className="nft-information">
          <div role="tablist" aria-label="Detalhes e avaliações" className="nft-tabs">
            <button id="nft-details-tab" type="button" role="tab" aria-controls="nft-info-panel" aria-selected={activeInfoTab === 'details'} onClick={() => setActiveInfoTab('details')}>Detalhes do NFT</button>
            <button id="nft-reviews-tab" type="button" role="tab" aria-controls="nft-info-panel" aria-selected={activeInfoTab === 'reviews'} onClick={() => setActiveInfoTab('reviews')}>Avaliações de colecionadores</button>
          </div>
          <div id="nft-info-panel" role="tabpanel" aria-labelledby={activeInfoTab === 'details' ? 'nft-details-tab' : 'nft-reviews-tab'} className="nft-info-panel">
            {activeInfoTab === 'details' ? (
              <>
                <p>{nftQuery.data.description}</p>
                <dl className="nft-detail-facts">
                  <MetadataItem label="Rede" value={nftQuery.data.chain} />
                  <MetadataItem label="Criador" value={nftQuery.data.creator} />
                  <MetadataItem label="Disponibilidade" value={nftQuery.data.available ? 'Disponível' : 'Vendido'} />
                </dl>
              </>
            ) : (
              <div className="nft-reviews-empty">
                <RatingStars />
                <h2>Nenhuma avaliação disponível</h2>
                <p>Não há avaliações de colecionadores disponíveis para este NFT.</p>
              </div>
            )}
          </div>
        </section>
        <section aria-labelledby="collection-heading" className="nft-collection">
          <h2 id="collection-heading">Mais desta coleção</h2>
          {collectionQuery.isLoading ? <LoadingSkeleton count={5} /> : null}
          {collectionQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar outros NFTs desta coleção.</p> : null}
          {collectionQuery.data?.items.length ? (
            <div id="nft-collection-items" className="nft-collection-grid" aria-busy={collectionQuery.isFetching}>
              {collectionQuery.data.items.map((item) => (
                <Link key={item.id} to="/nft/$nftId" params={{ nftId: item.id }} search={{ scenario }} className="group min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="nft-collection-image">
                    {item.images[0] ? <img src={item.images[0].src} alt={item.images[0].alt} className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-xs text-muted-foreground">Imagem indisponível</span>}
                  </div>
                  <p className="mt-3 text-sm leading-tight">{item.name}</p>
                  <p className="font-mono text-base font-bold leading-tight text-primary">{item.priceEth} ETH</p>
                </Link>
              ))}
            </div>
          ) : null}
          {collectionQuery.data && collectionQuery.data.totalPages > 1 ? (
            <nav aria-label="Páginas de Mais desta coleção" className="nft-collection-pagination">
              {Array.from({ length: collectionQuery.data.totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Ir para página ${page} da coleção`}
                    aria-current={collectionQuery.data.page === page ? 'page' : undefined}
                    aria-controls="nft-collection-items"
                    onClick={() => setCollectionPage(page)}
                  />
                )
              })}
            </nav>
          ) : null}
          <p className="sr-only" role="status">
            {collectionQuery.isFetching ? 'Carregando NFTs da coleção.' : collectionQuery.data ? `Página ${collectionQuery.data.page} de ${collectionQuery.data.totalPages} da coleção.` : ''}
          </p>
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
      <dt>{label}:</dt>{' '}
      <dd>{value}</dd>
    </div>
  )
}

// Decorative, unfilled stars indicate that no rating data is available.
function RatingStars() {
  return (
    <span className="nft-rating-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} />)}
    </span>
  )
}

function editionChipLabel(label: string) {
  const compact = label.replace(/^(?:edition|edição|edicao)\s+/i, '').trim()
  return /^(?:open(?:\s+edition)?|aberta)$/i.test(compact) ? 'ABERTA' : compact
}
