import { Link, createFileRoute } from '@tanstack/react-router'

import { ArrowRight,  RotateCcw} from 'lucide-react'

import { useEffect, useState } from 'react'

import { useNfts } from '../api/hooks/useNfts'
import { useCatalogInventory, useCatalogNfts, type PriceRange } from '@/components/catalog/use-catalog-nfts'

import type {

  MockScenario,

  Nft,

  NftAvailabilityFilter,

  NftListParams,

  NftSortOption,

} from '../api/types/nft'

import {

  FilterPanel,

  type CatalogFilterState,

} from '@/components/catalog/filter-panel'

import { Pagination } from '@/components/catalog/pagination'
import { SortSelect } from '@/components/catalog/sort-select'


import { NFTGrid } from '@/components/nft/nft-grid'

import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Card, CardContent } from '@/components/ui/card'

import { Skeleton } from '@/components/ui/skeleton'

type CatalogSearch = PriceRange & {

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

  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 64rem)').matches)

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

  const nftsQuery = useCatalogNfts(params, { minPrice: search.minPrice, maxPrice: search.maxPrice })
  const inventoryQuery = useCatalogInventory(search.scenario)

  const featuredQuery = useNfts({

    featuredOnly: true,

    page: 1,

    pageSize: 3,

    sort: 'newest',

    scenario: search.scenario,

  })

  const diaryQuery = useNfts({
    page: 1,
    pageSize: 4,
    sort: 'newest',
    scenario: search.scenario,
  })

  useEffect(() => {

    const desktop = window.matchMedia('(min-width: 64rem)')

    const updateFilterVisibility = () => setFiltersOpen(desktop.matches)

    desktop.addEventListener('change', updateFilterVisibility)

    return () => desktop.removeEventListener('change', updateFilterVisibility)

  }, [])

  function updateFilters(patch: Partial<CatalogSearch | CatalogFilterState>) {

    void navigate({

      search: (previous) => ({ ...previous, ...patch, page: 1 }),

    })

  }

  function updatePage(page: number) {

    void navigate({ search: (previous) => ({ ...previous, page }) })

  }

  const heroNft = featuredQuery.data?.items[0]

  return (

    <div className="figma-home space-y-10 pb-8 sm:space-y-12">

      <section aria-label="Apresentação da Kurio" className="relative grid items-start gap-6 py-3 lg:mx-2 lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-8 lg:pb-0 lg:pt-[3px]">
        <div className="min-w-0 lg:pl-10 lg:pt-10">
          <p className="mb-4 text-sm font-semibold tracking-[0.12em] text-[#f5f1eb]">Bem-vindo à Kurio</p>
          <h1 className="text-3xl font-bold uppercase leading-tight sm:text-4xl lg:text-4xl lg:leading-[1.6] xl:text-[44px]">
            <span className="block">Seja dono do futuro</span>
            <span className="block">da arte digital</span>
          </h1>
          <p className="mt-4 max-w-[550px] text-sm leading-6 text-[#b39463] lg:mt-0">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Button asChild className="mt-8 h-10 w-[140px] rounded-md bg-[#d28a4c] px-7 text-sm font-bold uppercase text-[#190f0b] hover:bg-[#d28a4c]/90">
            <a href="#catalogo">Explorar</a>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-[450px] lg:justify-self-end">
          {featuredQuery.isLoading ? <Skeleton className="aspect-square w-full rounded-3xl" /> : null}
          {heroNft ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: heroNft.id }}
              search={{ scenario: search.scenario }}
              aria-label={`Explorar ${heroNft.name}`}
              className="block aspect-square overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img src={heroNft.images[0]?.src} alt={heroNft.images[0]?.alt ?? `Imagem de ${heroNft.name}`} className="size-full object-cover" />
            </Link>
          ) : null}
          {featuredQuery.isError || (featuredQuery.isSuccess && !heroNft) ? (
            <div className="grid aspect-square place-items-center rounded-3xl border border-dashed border-primary/30 bg-card p-8 text-center text-sm text-muted-foreground">
              A obra em destaque não está disponível neste momento.
            </div>
          ) : null}
        </div>

        {/* A referência define um único banner; os pontos são apenas decorativos. */}
        <div aria-hidden="true" className="flex justify-center gap-2 lg:absolute lg:bottom-11 lg:left-[calc(50%+20px)] lg:-translate-x-1/2">
          <span className="size-2 rounded-full bg-[#d28a4c]" />
          <span className="size-2 rounded-full bg-[#d28a4c]" />
          <span className="size-2 rounded-full bg-[#d28a4c]" />
        </div>
      </section>

      <section id="catalogo" aria-label="Catálogo de NFTs" className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-8 gap-y-7 scroll-mt-24 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)] xl:gap-x-12">

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:col-start-2">
            <div className="flex items-center gap-4 overflow-x-auto text-xs font-normal leading-6 sm:text-sm" aria-label="Visualização do catálogo">
              <button type="button" className={search.availability === 'all' && search.sort === 'newest' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => updateFilters({ availability: 'all', sort: 'newest' })}>Todos os NFTs</button>
              <button type="button" className={search.sort === 'newest' && search.availability !== 'all' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => updateFilters({ sort: 'newest' })}>Novos lançamentos</button>
              <button type="button" className={search.sort === 'price-desc' ? 'whitespace-nowrap border-b-2 border-primary pb-1 text-primary' : 'whitespace-nowrap border-b-2 border-transparent pb-1 text-muted-foreground hover:text-foreground'} onClick={() => updateFilters({ sort: 'price-desc' })}>Em alta</button>
            </div>
            <div className="self-end sm:shrink-0">
              <SortSelect value={search.sort} onChange={(sort) => updateFilters({ sort })} />
            </div>
          </div>

          <aside aria-label="Filtros do catálogo" className="lg:sticky lg:top-20 lg:col-start-1 lg:row-start-1 lg:row-span-2">

            <details open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)} className="group bg-[#281914] p-4 lg:p-5">

              <summary className="flex cursor-pointer list-none items-center justify-between font-bold uppercase tracking-wide marker:content-none lg:hidden">

                Filtros e ordenação

                <span aria-hidden="true" className="text-primary transition group-open:rotate-45">+</span>

              </summary>

              <div className="mt-5 border-t border-border pt-5 lg:mt-0 lg:border-0 lg:pt-0">

                <FilterPanel value={search} onChange={updateFilters} items={inventoryQuery.data ?? []} loading={inventoryQuery.isPending} error={inventoryQuery.isError} onRetry={() => void inventoryQuery.refetch()} />

              </div>

            </details>

          </aside>

          <div className="grid min-w-0 gap-5 lg:col-start-2 lg:row-start-2">

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

                <Pagination page={nftsQuery.data.page} totalPages={nftsQuery.data.totalPages} onPageChange={updatePage} />

              </>

            ) : null}

          </div>

      </section>

      <section aria-labelledby="featured-heading" className="space-y-6">

        <SectionHeading eyebrow="Curadoria" title="NFTs em destaque" id="featured-heading" />

        {featuredQuery.isLoading ? <LoadingSkeleton count={3} /> : null}

        {featuredQuery.isError ? (

          <StateCard title="Nao foi possivel carregar os destaques" description={featuredQuery.error.message} action={<Button type="button" onClick={() => void featuredQuery.refetch()}><RotateCcw aria-hidden="true" />Tentar novamente</Button>} />

        ) : null}

        {featuredQuery.isSuccess && featuredQuery.data.items.length === 0 ? <StateCard title="Nenhum NFT em destaque" description="Volte mais tarde para ver a selecao." /> : null}

        {featuredQuery.isSuccess && featuredQuery.data.items.length > 0 ? (

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {featuredQuery.data.items.map((nft) => <FeaturedNftCard key={nft.id} nft={nft} scenario={search.scenario} />)}

          </div>

        ) : null}

      </section>

      {featuredQuery.data && featuredQuery.data.items.length >= 2 ? (

        <section aria-label="Conteúdo complementar" className="grid gap-3 lg:grid-cols-2">

          <EditorialCard nft={featuredQuery.data.items[0]} scenario={search.scenario} title="Lançamentos gênesis de edição limitada" description="Conheça edições escassas diretamente dos criadores antes da revelação pública." />

          <EditorialCard nft={featuredQuery.data.items[2] ?? featuredQuery.data.items[1]} scenario={search.scenario} title="Arte digital selecionada e muito mais" description="Explore artistas, coleções verificadas e obras digitais que definem a cultura atual." reverse />

        </section>

      ) : null}

      <section aria-labelledby="diario-heading" className="space-y-5">
      <SectionHeading eyebrow="Editorial" title="Diário da Cunhagem" id="diario-heading" />
      <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
        Histórias e obras da coleção para descobrir novos artistas.
      </p>
      {diaryQuery.isLoading ? <LoadingSkeleton count={4} /> : null}
      {diaryQuery.isError ? (
        <StateCard
          title="Não foi possível carregar o diário"
          description={diaryQuery.error.message}
          action={<Button type="button" onClick={() => void diaryQuery.refetch()}><RotateCcw aria-hidden="true" />Tentar novamente</Button>}
        />
      ) : null}
      {diaryQuery.isSuccess && diaryQuery.data.items.length === 0 ? (
        <StateCard title="Nenhuma obra para apresentar" description="Explore o catálogo quando novas obras estiverem disponíveis." />
      ) : null}
      {diaryQuery.isSuccess && diaryQuery.data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {diaryQuery.data.items.slice(0, 4).map((nft) => (
            <Link
              key={nft.id}
              to="/nft/$nftId"
              params={{ nftId: nft.id }}
              search={{ scenario: search.scenario }}
              className="group block min-w-0 overflow-hidden rounded-sm border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Ver obra ${nft.name} no Diário da Cunhagem`}
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {nft.images[0] ? (
                  <img
                    src={nft.images[0].src}
                    alt={nft.images[0].alt}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
                  />
                ) : (
                  <span className="grid size-full place-items-center p-3 text-center text-xs text-muted-foreground">Imagem indisponível</span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="truncate text-xs font-bold sm:text-sm">{nft.name}</h3>
                <p className="truncate text-xs text-muted-foreground">Arte digital em destaque</p>
                <p className="text-xs font-semibold text-primary">{nft.priceEth} ETH</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>

    </div>

  )

}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {

  return (

    <div className="space-y-1">

      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>

      <h2 id={id} className="text-xl font-bold uppercase tracking-wide sm:text-2xl">{title}</h2>

    </div>

  )

}

function FeaturedNftCard({ nft, scenario }: { nft: Nft; scenario: MockScenario }) {

  return (

    <Card className="overflow-hidden rounded-sm border-border bg-card p-0 transition-transform duration-300 hover:-translate-y-1">

      <Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }} className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Ver detalhes de ${nft.name}`}>

        <div className="aspect-square overflow-hidden bg-muted">

          {nft.images[0] ? <img src={nft.images[0].src} alt={nft.images[0].alt} className="size-full object-cover transition duration-500 hover:scale-[1.03]" /> : <span className="grid size-full place-items-center text-muted-foreground">Imagem indisponível</span>}

        </div>

        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">

          <div className="min-w-0"><h3 className="truncate font-semibold">{nft.name}</h3><p className="mt-1 font-bold text-primary">{nft.priceEth} ETH</p></div>

          <Badge variant={nft.available ? 'default' : 'secondary'}>{nft.available ? 'Disponivel' : 'Vendido'}</Badge>

        </CardContent>

      </Link>

    </Card>

  )

}

function EditorialCard({ nft, scenario, title, description, reverse = false }: { nft: Nft; scenario: MockScenario; title: string; description: string; reverse?: boolean }) {

  return (

    <article className="grid overflow-hidden rounded-sm border border-border bg-card sm:grid-cols-2">

      <img src={nft.images[0]?.src} alt="" className={`aspect-square size-full object-cover ${reverse ? 'sm:order-2' : ''}`} />

      <div className="flex flex-col items-start justify-center gap-3 p-4 sm:p-5">

        <h3 className="text-sm font-bold leading-snug sm:text-base">{title}</h3>

        <p className="text-xs leading-5 text-muted-foreground">{description}</p>

        <Button asChild variant="link" className="h-auto p-0 font-bold"><Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }}>Explorar <ArrowRight aria-hidden="true" /></Link></Button>

      </div>

    </article>

  )

}



export const Route = createFileRoute('/')({

  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({

    q: getOptionalString(search.q),

    ...getPriceRange(search),

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

function getPriceRange(search: Record<string, unknown>): PriceRange {
  const parse = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined
    if (typeof value === 'string' && !value.trim()) return undefined
    const price = Number(value)
    return Number.isFinite(price) && price >= 0 ? price : undefined
  }
  const minPrice = parse(search.minPrice)
  const maxPrice = parse(search.maxPrice)
  return minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
    ? { minPrice: maxPrice, maxPrice: minPrice }
    : { minPrice, maxPrice }
}

function getPage(value: unknown) {

  const page = Number(value)

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

}

function getAvailability(value: unknown): NftAvailabilityFilter {

  return value === 'available' || value === 'sold' ? value : 'all'

}

function getSort(value: unknown): NftSortOption {

  return value === 'price-asc' || value === 'price-desc' || value === 'name-asc' ? value : 'newest'

}

function getScenario(value: unknown): MockScenario {

  return value === 'latency' || value === 'error' || value === 'empty' ? value : 'normal'

}

type StateCardProps = { title: string; description: string; action?: React.ReactNode }

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
