import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import type { useNfts } from '@/api/hooks/useNfts'
import type { useCatalogInventory, useCatalogNfts } from '@/components/catalog/use-catalog-nfts'
import { FilterPanel } from '@/components/catalog/filter-panel'
import { Pagination } from '@/components/catalog/pagination'
import { SortSelect } from '@/components/catalog/sort-select'
import { NFTGrid } from '@/components/nft/nft-grid'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { CatalogFilterState, CatalogSearch } from '../model/types'
import { CatalogFeatured } from './catalog-highlights'

type CatalogSectionProps = {
  search: CatalogSearch
  nftsQuery: ReturnType<typeof useCatalogNfts>
  inventoryQuery: ReturnType<typeof useCatalogInventory>
  featuredQuery: ReturnType<typeof useNfts>
  mobileLayout: boolean
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  onFiltersChange: (patch: Partial<CatalogFilterState>) => void
  onPageChange: (page: number) => void
}

export function CatalogSection({ search, nftsQuery, inventoryQuery, featuredQuery, mobileLayout, filtersOpen, onFiltersOpenChange, onFiltersChange, onPageChange }: CatalogSectionProps) {
  return (
    <section id="catalogo" aria-label="Catálogo de NFTs" className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-8 gap-y-7 scroll-mt-24 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)] xl:gap-x-12">
        <h2 className="sr-only">Catálogo de NFTs</h2>

        <div className="home-catalog-tools flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:col-start-2">
          <div className="flex items-center gap-4 overflow-x-auto text-xs font-normal leading-6 sm:text-sm" role="group" aria-label="Visualização do catálogo">
            <button type="button" aria-pressed={search.availability === 'all' && search.sort === 'newest'} className={search.availability === 'all' && search.sort === 'newest' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => onFiltersChange({ availability: 'all', sort: 'newest' })}>Todos os NFTs</button>
            <button type="button" aria-pressed={search.sort === 'newest' && search.availability !== 'all'} className={search.sort === 'newest' && search.availability !== 'all' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => onFiltersChange({ sort: 'newest' })}>Novos lançamentos</button>
            <button type="button" aria-pressed={search.sort === 'price-desc'} className={search.sort === 'price-desc' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => onFiltersChange({ sort: 'price-desc' })}>Em alta</button>
          </div>
          <div className="home-catalog-sort self-end sm:shrink-0">
            <SortSelect value={search.sort} onChange={(sort) => onFiltersChange({ sort })} />
          </div>
        </div>

        <aside aria-label="Filtros do catálogo" className="home-catalog-sidebar min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">

          <details open={filtersOpen} onToggle={(event) => onFiltersOpenChange(event.currentTarget.open)} className="group bg-[#281914] p-4 lg:p-5">

            <summary className="flex cursor-pointer list-none items-center justify-between font-bold uppercase tracking-wide marker:content-none lg:hidden">

              Filtros e ordenação

              <span aria-hidden="true" className="text-primary transition group-open:rotate-45">+</span>

            </summary>

            <div className="mt-5 border-t border-border pt-5 lg:mt-0 lg:border-0 lg:pt-0">

              {!mobileLayout ? <FilterPanel value={search} onChange={onFiltersChange} items={inventoryQuery.data ?? []} loading={inventoryQuery.isPending} error={inventoryQuery.isError} onRetry={() => void inventoryQuery.refetch()} /> : null}

            </div>

          </details>

          <CatalogFeatured featuredQuery={featuredQuery} scenario={search.scenario} />

        </aside>

        <div className="home-catalog-results grid min-w-0 gap-5 lg:col-start-2 lg:row-start-2">

          <div role="status" className="sr-only">

            <span>

              {nftsQuery.data ? `${nftsQuery.data.total} NFTs encontrados` : 'Consultando acervo'}

              {nftsQuery.isFetching && !nftsQuery.isLoading ? ' · Atualizando' : ''}

            </span>

          </div>

          {nftsQuery.isLoading ? <LoadingSkeleton /> : null}

          {nftsQuery.isError ? <StateCard title="Nao foi possivel carregar os NFTs" description={nftsQuery.error.message} action={<Button type="button" onClick={() => void nftsQuery.refetch()}><RotateCcw aria-hidden="true" />Tentar novamente</Button>} /> : null}

          {nftsQuery.isSuccess && nftsQuery.data.items.length === 0 ? <StateCard title="Nenhum NFT encontrado" description="Ajuste a busca ou os filtros para ver outros resultados." /> : null}

          {nftsQuery.data && nftsQuery.data.items.length > 0 ? (

            <>

              <NFTGrid nfts={nftsQuery.data.items} scenario={search.scenario} />

              <Pagination page={nftsQuery.data.page} totalPages={nftsQuery.data.totalPages} onPageChange={onPageChange} />

            </>

          ) : null}

        </div>

    </section>
  )
}

type StateCardProps = { title: string; description: string; action?: ReactNode }

function StateCard({ title, description, action }: StateCardProps) {

  return (

    <Card className="rounded-sm border border-dashed border-primary/30 bg-card">

      <CardContent className="grid min-h-52 place-items-center p-8 text-center">

        <div className="max-w-md space-y-4">

          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>

          <p className="text-muted-foreground">{description}</p>

          {action}

        </div>

      </CardContent>

    </Card>

  )

}
