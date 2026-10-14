import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, RotateCcw, ShoppingCart } from 'lucide-react'
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
  const availableEditions = nftQuery.data?.editions.filter((edition) => edition.available) ?? []
  const selectedEdition = selectedEditionId ?? availableEditions[0]?.id
  const addError = addCartItem.error instanceof ApiError ? addCartItem.error : null

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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div className="nft-art-surface aspect-square rounded-3xl from-zinc-950 via-violet-700 to-rose-300 shadow-2xl">
            <div className="absolute inset-6 rounded-3xl border border-white/20" />
          </div>
          <div className="space-y-6">
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
                      className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/35 px-4 py-3"
                    >
                      <span className="text-sm font-medium">{edition.label}</span>
                      <Badge variant={edition.available ? 'default' : 'secondary'}>
                        {edition.available ? 'Disponivel' : 'Vendida'}
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
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Select
                    value={selectedEdition}
                    onValueChange={(value) => setSelectedEditionId(value)}
                    disabled={availableEditions.length === 0}
                  >
                    <SelectTrigger className="w-full">
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
                  <Button
                    type="button"
                    disabled={
                      addCartItem.isPending ||
                      !nftQuery.data.available ||
                      !selectedEdition
                    }
                    onClick={() => {
                      if (!selectedEdition) {
                        return
                      }

                      addCartItem.mutate({
                        nftId: nftQuery.data.id,
                        editionId: selectedEdition,
                        quantity: 1,
                      })
                    }}
                  >
                    <ShoppingCart aria-hidden="true" />
                    {addCartItem.isPending ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
                {addCartItem.isSuccess ? (
                  <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
                    NFT adicionado ao carrinho.
                  </p>
                ) : null}
                {addError ? (
                  <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
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
