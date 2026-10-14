import { createFileRoute } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'

import { useNfts } from '../api/hooks/useNfts'
import type {
  MockScenario,
  NftAvailabilityFilter,
  NftListParams,
  NftSortOption,
} from '../api/types/nft'
import {
  FilterPanel,
  type CatalogFilterState,
} from '@/components/catalog/filter-panel'
import { Pagination } from '@/components/catalog/pagination'
import { SearchInput } from '@/components/catalog/search-input'
import { NFTGrid } from '@/components/nft/nft-grid'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type CatalogSearch = {
  q?: string
  category?: string
  chain?: string
  availability: NftAvailabilityFilter
  sort: NftSortOption
  page: number
  scenario: MockScenario
}

const pageSize = 6

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const params: NftListParams = {
    search: search.q,
    category: search.category,
    chain: search.chain,
    availability: search.availability,
    sort: search.sort,
    page: search.page,
    pageSize,
    scenario: search.scenario,
  }
  const nftsQuery = useNfts(params)

  function updateFilters(patch: Partial<CatalogSearch | CatalogFilterState>) {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: 1,
      }),
    })
  }

  function updatePage(page: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page,
      }),
    })
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Catalogo
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Descubra NFTs selecionados para colecionadores digitais.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Listagem integrada a uma API REST simulada com Axios, TanStack Query
            e MSW, pronta para receber o layout final do Figma.
          </p>
        </div>
        <Card className="bg-muted/45">
          <CardContent className="p-5">
            <SearchInput
              value={search.q}
              onChange={(q) => updateFilters({ q })}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <FilterPanel
            value={search}
            onChange={(patch) => updateFilters(patch)}
          />
        </CardContent>
      </Card>

      {nftsQuery.isLoading ? <LoadingSkeleton /> : null}

      {nftsQuery.isError ? (
        <StateCard
          title="Nao foi possivel carregar os NFTs"
          description={nftsQuery.error.message}
          action={
            <Button type="button" onClick={() => void nftsQuery.refetch()}>
              <RotateCcw aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {nftsQuery.isSuccess && nftsQuery.data.items.length === 0 ? (
        <StateCard
          title="Nenhum NFT encontrado"
          description="Ajuste a busca ou os filtros para ver outros resultados."
        />
      ) : null}

      {nftsQuery.data && nftsQuery.data.items.length > 0 ? (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <span>{nftsQuery.data.total} NFTs encontrados</span>
            {nftsQuery.isFetching ? <span>Atualizando resultados...</span> : null}
          </div>
          <NFTGrid nfts={nftsQuery.data.items} scenario={search.scenario} />
          <Pagination
            page={nftsQuery.data.page}
            totalPages={nftsQuery.data.totalPages}
            onPageChange={updatePage}
          />
        </div>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: getOptionalString(search.q),
    category: getOptionalString(search.category),
    chain: getOptionalString(search.chain),
    availability: getAvailability(search.availability),
    sort: getSort(search.sort),
    page: getPage(search.page),
    scenario: getScenario(search.scenario),
  }),
  component: HomePage,
})

function getOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getPage(value: unknown) {
  const page = Number(value)

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function getAvailability(value: unknown): NftAvailabilityFilter {
  if (value === 'available' || value === 'sold') {
    return value
  }

  return 'all'
}

function getSort(value: unknown): NftSortOption {
  if (value === 'price-asc' || value === 'price-desc' || value === 'name-asc') {
    return value
  }

  return 'newest'
}

function getScenario(value: unknown): MockScenario {
  if (value === 'latency' || value === 'error' || value === 'empty') {
    return value
  }

  return 'normal'
}

type StateCardProps = {
  title: string
  description: string
  action?: React.ReactNode
}

function StateCard({ title, description, action }: StateCardProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-52 place-items-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          {action}
        </div>
      </CardContent>
    </Card>
  )
}
