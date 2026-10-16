import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Decimal from 'decimal.js'

import { getNfts } from '@/api/nfts'
import { queryKeys } from '@/api/queryKeys'
import type { MockScenario, NftListParams } from '@/api/types/nft'
import type { PriceRange } from '@/features/catalog/model/types'

async function getAllNfts(params: NftListParams, signal: AbortSignal) {
  const first = await getNfts({ ...params, page: 1, pageSize: 100 }, signal)
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
    getNfts({ ...params, page: index + 2, pageSize: 100 }, signal),
  ))
  return [...first.items, ...rest.flatMap((page) => page.items)]
}

export function useCatalogInventory(scenario: MockScenario) {
  return useQuery({
    queryKey: [...queryKeys.nfts.all, 'catalog-inventory', scenario],
    queryFn: ({ signal }) => getAllNfts({ scenario }, signal),
  })
}

export function useCatalogNfts(params: NftListParams, range: PriceRange) {
  const hasPriceFilter = range.minPrice !== undefined || range.maxPrice !== undefined
  return useQuery({
    queryKey: hasPriceFilter
      ? [...queryKeys.nfts.all, 'catalog-price', params, range]
      : queryKeys.nfts.list(params),
    queryFn: async ({ signal }) => {
      if (!hasPriceFilter) return getNfts(params, signal)
      // The existing API applies search, category, chain, availability and ordering.
      // Price must be applied to all matching items before slicing the requested page.
      const items = (await getAllNfts(params, signal)).filter((nft) => {
        const price = new Decimal(nft.priceEth)
        return (range.minPrice === undefined || price.gte(range.minPrice))
          && (range.maxPrice === undefined || price.lte(range.maxPrice))
      })
      const page = params.page ?? 1
      const pageSize = params.pageSize ?? 6
      return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, totalPages: Math.ceil(items.length / pageSize) }
    },
    placeholderData: keepPreviousData,
  })
}
