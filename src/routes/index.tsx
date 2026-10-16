import { createFileRoute, useLocation } from '@tanstack/react-router'

import type { MockScenario, NftAvailabilityFilter, NftSortOption } from '@/api/types/nft'
import { CatalogPage } from '@/features/catalog/components/catalog-page'
import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import type { CatalogFilterState, CatalogSearch, PriceRange } from '@/features/catalog/model/types'

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const hash = useLocation({ select: (location) => location.hash })

  function updateFilters(patch: Partial<CatalogFilterState>, mobileLayout: boolean) {

    void navigate({

      search: (previous) => ({ ...previous, ...patch, page: 1 }),
      hash: mobileLayout && hash === 'filtros' ? 'filtros' : undefined,

    })

  }

  function updatePage(page: number) {

    void navigate({ search: (previous) => ({ ...previous, page }) })

  }

  function closePanel() {
    void navigate({ search: (previous) => previous, hash: '', replace: true })
  }

  return (
    <CatalogPage
      search={search}
      hash={hash}
      onFiltersChange={updateFilters}
      onPageChange={updatePage}
      onClosePanel={closePanel}
    />
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

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : defaultCatalogSearch.page

}

function getAvailability(value: unknown): NftAvailabilityFilter {

  return value === 'available' || value === 'sold' ? value : defaultCatalogSearch.availability

}

function getSort(value: unknown): NftSortOption {

  return value === 'price-asc' || value === 'price-desc' || value === 'name-asc' ? value : defaultCatalogSearch.sort

}

function getScenario(value: unknown): MockScenario {

  return value === 'latency' || value === 'error' || value === 'empty' ? value : defaultCatalogSearch.scenario

}
