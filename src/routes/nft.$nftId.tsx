import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ImageOff, RotateCcw, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

import { useAddCartItem } from '@/api/hooks/useCart'
import { useNftDetail } from '../api/hooks/useNfts'
import type { MockScenario } from '../api/types/nft'
import { ApiError } from '@/api/http/errors'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FavoriteButton } from '@/components/nft/favorite-button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type NftDetailSearch = {
  scenario: MockScenario
}

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const { scenario } = Route.useSearch()
  const nftQuery = useNftDetail(nftId, scenario)
  const addCartItem = useAddCartItem()
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const availableEditions = nftQuery.data?.available
    ? nftQuery.data.editions.filter((edition) => edition.available)
    : []
  const selectedEdition = availableEditions.find((edition) => edition.id === selectedEditionId) ?? availableEditions[0]
  const maxQuantity = selectedEdition?.stock ?? 1
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity
  const addError = addCartItem.error instanceof ApiError ? addCartItem.error : null
  const activeImage = nftQuery.data?.images[selectedImageIndex] ?? nftQuery.data?.images[0]

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
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <div className="grid aspect-square overflow-hidden rounded-3xl bg-muted shadow-lg">
              {activeImage && !failedImages.has(activeImage.src) ? (
                <img src={activeImage.src} alt={activeImage.alt} onError={() => markImageUnavailable(activeImage.src)} className="size-full object-cover" />
              ) : (
                <div role="status" className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <ImageOff aria-hidden="true" className="size-8" />Imagem indisponivel para este NFT.
                </div>
              )}
            </div>
            {nftQuery.data.images.length > 1 ? (
              <div role="group" aria-label="Miniaturas do NFT" className="flex flex-wrap gap-3">
                {nftQuery.data.images.map((image, index) => (
                  <button key={`${image.src}-${index}`} type="button" aria-label={`Mostrar ${image.label.toLowerCase()} de ${nftQuery.data.name}`} aria-pressed={activeImage === image} onClick={() => setSelectedImageIndex(index)} className="size-20 overflow-hidden rounded-xl border-2 border-border bg-muted outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary">
                    {failedImages.has(image.src) ? <span className="grid size-full place-items-center text-xs text-muted-foreground">Sem imagem</span> : <img src={image.src} alt="" onError={() => markImageUnavailable(image.src)} className="size-full object-cover" />}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{nftQuery.data.chain}</Badge>
                <Badge variant={nftQuery.data.available ? 'default' : 'secondary'}>
                  {nftQuery.data.available ? 'Disponivel' : 'Vendido'}
                </Badge>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {nftQuery.data.name}
              </h1>
              <FavoriteButton nftId={nftQuery.data.id} name={nftQuery.data.name} />
              <p className="text-lg text-muted-foreground">
                {nftQuery.data.description}
              </p>
            </div>

            <Card>
              <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                <MetadataItem label="Criador" value={nftQuery.data.creator} />
                <MetadataItem label="Colecao" value={nftQuery.data.collection} />
                <MetadataItem label="Rede" value={nftQuery.data.chain} />
                <MetadataItem
                  label="Preco"
                  value={`${nftQuery.data.priceEth} ETH`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Edicoes</h2>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade simulada pela API mockada.
                  </p>
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {nftQuery.data.editions.map((edition) => (
                    <div
                      key={edition.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/35 px-4 py-3"
                    >
                      <span className="text-sm font-medium">{edition.label}</span>
                      <Badge variant={nftQuery.data.available && edition.available ? 'default' : 'secondary'}>
                        {nftQuery.data.available && edition.available ? 'Disponivel' : 'Vendida'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Adicionar ao carrinho</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma edicao disponivel para gerar a cotacao depois.
                  </p>
                </div>
                <Separator />
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                  <Select
                    value={selectedEdition?.id}
                    onValueChange={(value) => { setSelectedEditionId(value); setQuantity(1) }}
                    disabled={availableEditions.length === 0}
                  >
                    <SelectTrigger aria-label="Edicao do NFT" className="w-full min-w-0">
                      <SelectValue placeholder="Selecione uma edicao" />
                    </SelectTrigger>
                    <SelectContent>
                      {nftQuery.data.editions.map((edition) => (
                        <SelectItem
                          key={edition.id}
                          value={edition.id}
                          disabled={!edition.available}
                        >
                          {edition.label} ·{' '}
                          {edition.available ? 'disponivel' : 'vendida'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {addCartItem.isPending ? 'Adicionando...' : 'Adicionar'}
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
                <Button asChild variant="outline">
                  <Link to="/cart">Ver carrinho</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
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
