import { getNftImageSrc, restoreNftImageFallback } from '@/features/nft/model/nft-image-variants'
import { Link } from '@tanstack/react-router'

import type { useNfts } from '@/api/hooks/useNfts'
import type { MockScenario, Nft } from '@/api/types/nft'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type CatalogHighlightsProps = {
  featuredQuery: ReturnType<typeof useNfts>
  scenario: MockScenario
}

export function CatalogHero({ featuredQuery, scenario }: CatalogHighlightsProps) {
  const heroNft = featuredQuery.data?.items[0]
  const promotionalNft = featuredQuery.data?.items[1] ?? heroNft

  return (
    <section aria-label="Apresentação da Kurio" className="home-hero relative grid items-start gap-6 py-3 lg:mx-2 lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-8 lg:pb-0 lg:pt-[3px]">
      <div className="home-hero-copy min-w-0 lg:pl-10 lg:pt-10">
        <p className="mb-4 text-sm font-semibold tracking-[0.12em] text-[#f5f1eb]">Bem-vindo à Kurio</p>
        <h1 className="text-3xl font-bold uppercase leading-tight sm:text-4xl lg:text-4xl lg:leading-[1.6] xl:text-[44px]">
          <span className="home-hero-mobile-title">Seja dono da cultura digital</span>
          <span className="block">Seja dono do futuro</span>
          <span className="block">da arte digital</span>
        </h1>
        <p className="mt-4 max-w-[550px] text-sm leading-6 text-[#b39463] lg:mt-0">
          <span className="home-hero-mobile-description">Descubra NFTs selecionados de criadores do mundo todo.</span>
          <span className="home-hero-desktop-description">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</span>
        </p>
        <Button asChild className="mt-8 h-10 w-[140px] rounded-md bg-[#d28a4c] px-7 text-sm font-bold uppercase text-[#190f0b] hover:bg-[#d28a4c]/90">
          <a href="#catalogo">Explorar</a>
        </Button>
      </div>

      <div className="home-hero-art mx-auto w-full max-w-[450px] lg:justify-self-end">
        {featuredQuery.isLoading ? <Skeleton className="aspect-square w-full rounded-3xl" /> : null}
        {heroNft ? (
          <Link
            to="/nft/$nftId"
            params={{ nftId: heroNft.id }}
            search={{ scenario }}
            aria-label={`Explorar ${heroNft.name}`}
            className="block aspect-square overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img src={getNftImageSrc(heroNft.images[0]?.src)} onError={(event) => { restoreNftImageFallback(event.currentTarget, heroNft.images[0]?.src) }} alt={heroNft.images[0]?.alt ?? `Imagem de ${heroNft.name}`} className="size-full object-cover" />
          </Link>
        ) : null}
        {featuredQuery.isError || (featuredQuery.isSuccess && !heroNft) ? (
          <div className="grid aspect-square place-items-center rounded-3xl border border-dashed border-primary/30 bg-card p-8 text-center text-sm text-muted-foreground">
            A obra em destaque não está disponível neste momento.
          </div>
        ) : null}
      </div>

      {promotionalNft?.images[0] ? <img src={getNftImageSrc(promotionalNft.images[0].src)} onError={(event) => { restoreNftImageFallback(event.currentTarget, promotionalNft.images[0].src) }} alt="" aria-hidden="true" className="home-hero-secondary" /> : null}

      {/* A referência define um único banner; os pontos são apenas decorativos. */}
      <div aria-hidden="true" className="home-hero-indicators flex justify-center gap-2 lg:absolute lg:bottom-11 lg:left-[calc(50%+20px)] lg:-translate-x-1/2">
        <span className="size-2 rounded-full bg-[#d28a4c]" />
        <span className="size-2 rounded-full bg-[#d28a4c]" />
        <span className="size-2 rounded-full bg-[#d28a4c]" />
      </div>
    </section>
  )
}

export function CatalogFeatured({ featuredQuery, scenario }: CatalogHighlightsProps) {
  const promotionalNft = featuredQuery.data?.items[1] ?? featuredQuery.data?.items[0]

  return (
    <section aria-labelledby="featured-heading" className="mx-auto mt-6 w-full max-w-[310px] bg-[#281914] bg-[radial-gradient(ellipse_at_top_right,rgba(179,148,99,0.16),transparent_65%)] pt-6">
      <h2 id="featured-heading" className="px-5 text-2xl font-bold uppercase leading-7 text-[#d28a4c]">NFT em destaque</h2>
      <p className="mb-2 mt-3 text-center text-2xl font-bold uppercase leading-7 text-[#f5f1eb]">Oferta limitada</p>
      {featuredQuery.isLoading ? <Skeleton className="aspect-[310/366] w-full rounded-3xl" /> : null}
      {featuredQuery.isError ? (
        <div className="space-y-3 p-5 text-sm text-[#b39463]">
          <p role="alert">Não foi possível carregar o destaque.</p>
          <Button type="button" variant="outline" className="w-full rounded-sm" onClick={() => void featuredQuery.refetch()}>Tentar novamente</Button>
        </div>
      ) : null}
      {featuredQuery.isSuccess && !promotionalNft ? <p className="p-5 text-sm text-[#b39463]">Nenhum NFT em destaque disponível.</p> : null}
      {promotionalNft ? <FeaturedNftCard nft={promotionalNft} scenario={scenario} /> : null}
    </section>
  )
}

function FeaturedNftCard({ nft, scenario }: { nft: Nft; scenario: MockScenario }) {
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      search={{ scenario }}
      aria-label={`Explorar NFT em destaque: ${nft.name}`}
      className="block aspect-[310/366] overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      {nft.images[0] ? (
        <img src={getNftImageSrc(nft.images[0].src)} onError={(event) => { restoreNftImageFallback(event.currentTarget, nft.images[0].src) }} alt={nft.images[0].alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center p-5 text-center text-sm text-[#b39463]">Imagem indisponível</span>
      )}
    </Link>
  )
}
