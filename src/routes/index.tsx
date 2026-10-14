import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BellRing, RotateCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useNfts } from '../api/hooks/useNfts'
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
import { SearchInput } from '@/components/catalog/search-input'
import { NFTGrid } from '@/components/nft/nft-grid'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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
  const nftsQuery = useNfts(params)
  const featuredQuery = useNfts({
    featuredOnly: true,
    page: 1,
    pageSize: 3,
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
    <div className="figma-home space-y-16 pb-8 sm:space-y-20">
      <section className="grid min-h-[29rem] items-center gap-10 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)] lg:py-10">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold tracking-[0.12em] text-muted-foreground">Bem-vindo à Kurio</p>
          <h1 className="max-w-3xl text-4xl font-bold uppercase leading-[1.15] tracking-[0.025em] sm:text-5xl lg:text-6xl">
            Seja dono do futuro da arte digital
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e faça parte da cultura da internet.
          </p>
          <Button asChild size="lg" className="h-11 rounded-sm px-6 font-bold uppercase tracking-wide">
            <a href="#catalogo">Explorar <ArrowRight aria-hidden="true" /></a>
          </Button>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
          <span className="absolute -inset-3 -z-10 rounded-[2rem] border border-primary/15 bg-primary/5" aria-hidden="true" />
          {featuredQuery.isLoading ? <Skeleton className="aspect-square w-full rounded-[1.5rem]" /> : null}
          {heroNft ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: heroNft.id }}
              search={{ scenario: search.scenario }}
              aria-label={`Explorar ${heroNft.name}`}
              className="group relative block aspect-square overflow-hidden rounded-[1.5rem] bg-card outline-none ring-1 ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img src={heroNft.images[0]?.src} alt={heroNft.images[0]?.alt ?? `Imagem de ${heroNft.name}`} className="size-full object-cover transition duration-500 group-hover:scale-[1.025]" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-background via-background/80 to-transparent p-5 pt-20">
                <span>
                  <span className="block text-sm font-semibold">{heroNft.name}</span>
                  <span className="mt-1 block font-bold text-primary">{heroNft.priceEth} ETH</span>
                </span>
                <Badge variant={heroNft.available ? 'default' : 'secondary'}>{heroNft.available ? 'Disponível' : 'Vendido'}</Badge>
              </span>
            </Link>
          ) : null}
          {featuredQuery.isError || (featuredQuery.isSuccess && !heroNft) ? (
            <div className="grid aspect-square place-items-center rounded-[1.5rem] border border-dashed border-primary/30 bg-card p-8 text-center text-sm text-muted-foreground">
              A obra em destaque não está disponível neste momento.
            </div>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredQuery.data.items.map((nft) => <FeaturedNftCard key={nft.id} nft={nft} scenario={search.scenario} />)}
          </div>
        ) : null}
      </section>

      <section id="catalogo" aria-labelledby="catalog-heading" className="scroll-mt-24 space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="Mercado" title="Explore a coleção" id="catalog-heading" />
          <div className="w-full lg:max-w-sm"><SearchInput value={search.q} onChange={(q) => updateFilters({ q })} /></div>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Filtros do catálogo" className="lg:sticky lg:top-20">
            <details open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)} className="group rounded-sm border border-border bg-card p-4 lg:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold uppercase tracking-wide marker:content-none lg:hidden">
                Filtros e ordenação
                <span aria-hidden="true" className="text-primary transition group-open:rotate-45">+</span>
              </summary>
              <div className="mt-5 border-t border-border pt-5 lg:mt-0 lg:border-0 lg:pt-0">
                <div className="mb-5 hidden border-b border-border pb-4 lg:block">
                  <h3 className="font-bold uppercase tracking-wide">Filtros</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Refine a seleção disponível.</p>
                </div>
                <FilterPanel value={search} onChange={(patch) => updateFilters(patch)} />
              </div>
            </details>
          </aside>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-col justify-between gap-2 border-b border-border pb-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
              <span className="font-semibold text-foreground">Todos os NFTs</span>
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
        </div>
      </section>

      {featuredQuery.data && featuredQuery.data.items.length >= 2 ? (
        <section aria-label="Conteúdo complementar" className="grid gap-5 lg:grid-cols-2">
          <EditorialCard nft={featuredQuery.data.items[0]} scenario={search.scenario} title="Lançamentos gênesis de edição limitada" description="Conheça edições escassas diretamente dos criadores antes da revelação pública." />
          <EditorialCard nft={featuredQuery.data.items[2] ?? featuredQuery.data.items[1]} scenario={search.scenario} title="Arte digital selecionada e muito mais" description="Explore artistas, coleções verificadas e obras digitais que definem a cultura atual." reverse />
        </section>
      ) : null}

      <section aria-label="Benefícios da plataforma" className="grid divide-y divide-border border-y border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Benefit icon={ShieldCheck} title="Segurança da carteira">Proteja sua coleção com uma experiência clara e confiável.</Benefit>
        <Benefit icon={UsersRound} title="Criadores em destaque">Conheça artistas, estúdios e comunidades da arte digital.</Benefit>
        <Benefit icon={BellRing} title="Alertas de lançamentos">Acompanhe novidades, edições raras e mudanças no acervo.</Benefit>
      </section>
    </div>
  )
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">{title}</h2>
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
      <div className="flex flex-col items-start justify-center gap-3 p-6">
        <h3 className="text-lg font-bold leading-snug">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        <Button asChild variant="link" className="h-auto p-0 font-bold"><Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }}>Explorar <ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </article>
  )
}

function Benefit({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: React.ReactNode }) {
  return (
    <article className="p-6">
      <span className="mb-4 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Icon aria-hidden="true" className="size-5" /></span>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </article>
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
