import type { MockScenario, NftAvailabilityFilter, NftSortOption } from '@/api/types/nft'

export type PriceRange = { minPrice?: number; maxPrice?: number }

export type CatalogFilterState = PriceRange & {
  category?: string
  chain?: string
  availability: NftAvailabilityFilter
  sort: NftSortOption
  scenario: MockScenario
}

export type CatalogSearch = CatalogFilterState & {
  q?: string
  page: number
}
