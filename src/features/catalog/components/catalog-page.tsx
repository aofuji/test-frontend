import { useEffect, useState } from 'react'

import { useSession } from '@/api/hooks/useAuth'
import { useFavorites } from '@/api/hooks/useFavorites'
import { useNfts } from '@/api/hooks/useNfts'
import type { NftListParams } from '@/api/types/nft'
import { useCatalogInventory, useCatalogNfts } from '@/components/catalog/use-catalog-nfts'
import { MintingDiary } from '@/components/home/minting-diary'
import type { CatalogFilterState, CatalogSearch } from '../model/types'
import { CatalogHero } from './catalog-highlights'
import { CatalogSection } from './catalog-section'
import { CatalogEditorial } from './catalog-editorial'
import { CatalogMobilePanels } from './catalog-mobile-panels'

type CatalogPageProps = {
  search: CatalogSearch
  hash: string
  onFiltersChange: (patch: Partial<CatalogFilterState>, mobileLayout: boolean) => void
  onPageChange: (page: number) => void
  onClosePanel: () => void
}

const pageSize = 9

export function CatalogPage({ search, hash, onFiltersChange, onPageChange, onClosePanel }: CatalogPageProps) {
  const session = useSession()
  const favorites = useFavorites()
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 639px)').matches)


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

  useEffect(() => {

    const desktop = window.matchMedia('(min-width: 64rem)')

    const mobile = window.matchMedia('(max-width: 639px)')
    const updateFilterVisibility = () => { setFiltersOpen(desktop.matches); setMobileLayout(mobile.matches) }

    desktop.addEventListener('change', updateFilterVisibility)
    mobile.addEventListener('change', updateFilterVisibility)

    return () => { desktop.removeEventListener('change', updateFilterVisibility); mobile.removeEventListener('change', updateFilterVisibility) }

  }, [])

  function updateFilters(patch: Partial<CatalogFilterState>) {
    onFiltersChange(patch, mobileLayout)
  }

  return (
    <div className="figma-home space-y-10 pb-8 sm:space-y-12">
      <CatalogHero featuredQuery={featuredQuery} scenario={search.scenario} />
      <CatalogSection
        search={search}
        nftsQuery={nftsQuery}
        inventoryQuery={inventoryQuery}
        featuredQuery={featuredQuery}
        mobileLayout={mobileLayout}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        onFiltersChange={updateFilters}
        onPageChange={onPageChange}
      />
      <CatalogEditorial items={featuredQuery.data?.items} scenario={search.scenario} />
      <MintingDiary />
      {mobileLayout ? (
        <CatalogMobilePanels
          search={search}
          hash={hash}
          session={session}
          favorites={favorites}
          inventoryQuery={inventoryQuery}
          onFiltersChange={updateFilters}
          onClosePanel={onClosePanel}
        />
      ) : null}
    </div>
  )
}
