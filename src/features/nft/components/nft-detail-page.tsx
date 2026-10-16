import { Link } from '@tanstack/react-router'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { useAddCartItem } from '@/api/hooks/useCart'
import { useNftDetail, useNfts } from '@/api/hooks/useNfts'
import type { MockScenario } from '@/api/types/nft'
import { ApiError } from '@/api/http/errors'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NftGallery } from './nft-gallery'
import { NftSummary } from './nft-summary'
import { NftPurchasePanel } from './nft-purchase-panel'
import { NftInformation, type NftInfoTab } from './nft-information'
import { NftCollection } from './nft-collection'

export function NftDetailPage({ nftId, scenario }: { nftId: string; scenario: MockScenario }) {
  const nftQuery = useNftDetail(nftId, scenario)
  const [collectionPage, setCollectionPage] = useState(1)
  const collectionQuery = useNfts({ page: collectionPage, pageSize: 5, sort: 'newest', scenario })
  const addCartItem = useAddCartItem()
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeInfoTab, setActiveInfoTab] = useState<NftInfoTab>('details')
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

  const purchaseDisabled = addCartItem.isPending || !nftQuery.data?.available || !selectedEdition || !validQuantity

  function addSelectedToCart() {
    if (!nftQuery.data || purchaseDisabled || !selectedEdition) return
    addCartItem.mutate({ nftId: nftQuery.data.id, editionId: selectedEdition.id, quantity })
  }

  return (
    <section className="nft-detail">
      <nav aria-label="Caminho de navegação" className="nft-breadcrumb">
        <Link to="/" search={defaultCatalogSearch}>Início</Link>
        <span aria-hidden="true">/</span>
        <Link to="/" search={defaultCatalogSearch} hash="catalogo">Mercado</Link>
      </nav>

      {!nftQuery.isSuccess ? <Link to="/" search={{ ...defaultCatalogSearch, scenario }} hash="catalogo" aria-label="Voltar ao catálogo" className="nft-mobile-fallback-back"><ChevronLeft aria-hidden="true" /></Link> : null}
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
            <div className="nft-mobile-topbar">
              <Link to="/" search={{ ...defaultCatalogSearch, scenario }} hash="catalogo" aria-label="Voltar ao catálogo" className="nft-mobile-back"><ChevronLeft aria-hidden="true" /></Link>
            </div>
            <NftGallery
              nftName={nftQuery.data.name}
              galleryImages={galleryImages}
              activeImage={activeImage}
              failedImages={failedImages}
              setSelectedImageIndex={setSelectedImageIndex}
              markImageUnavailable={markImageUnavailable}
            />
            <NftSummary nft={nftQuery.data} onShowReviews={() => {
              setActiveInfoTab('reviews')
              document.getElementById('nft-reviews-tab')?.focus()
            }}>
              <NftPurchasePanel
                nft={nftQuery.data}
                selectedEdition={selectedEdition}
                setSelectedEditionId={setSelectedEditionId}
                quantity={quantity}
                setQuantity={setQuantity}
                maxQuantity={maxQuantity}
                validQuantity={validQuantity}
                purchaseDisabled={purchaseDisabled}
                addCartItem={addCartItem}
                addError={addError}
                addSelectedToCart={addSelectedToCart}
              />
            </NftSummary>
          </div>
          <NftInformation nft={nftQuery.data} activeInfoTab={activeInfoTab} setActiveInfoTab={setActiveInfoTab} />
          <NftCollection collectionQuery={collectionQuery} scenario={scenario} setCollectionPage={setCollectionPage} />
        </>
      ) : null}
    </section>
  )
}
