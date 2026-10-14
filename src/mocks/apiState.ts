import type {
  MockScenario,
  NftAvailabilityFilter,
  NftListParams,
  NftListResponse,
  NftSortOption,
} from '../api/types/nft'
import { getNfts } from './nftState'
import { featuredNftIds } from './fixtures/nfts'

const defaultPage = 1
const defaultPageSize = 6

export function listNfts(params: NftListParams): NftListResponse {
  if (params.scenario === 'empty') {
    return {
      items: [],
      page: params.page ?? defaultPage,
      pageSize: params.pageSize ?? defaultPageSize,
      total: 0,
      totalPages: 0,
    }
  }

  const page = Math.max(params.page ?? defaultPage, 1)
  const pageSize = Math.max(params.pageSize ?? defaultPageSize, 1)
  const search = params.search?.trim().toLowerCase()

  const filtered = getNfts()
    .filter((nft) => {
      if (!search) {
        return true
      }

      return nft.name.toLowerCase().includes(search)
    })
    .filter((nft) => matchesValue(nft.category, params.category))
    .filter((nft) => matchesValue(nft.chain, params.chain))
    .filter((nft) => matchesAvailability(nft.available, params.availability))
    .filter((nft) => !params.featuredOnly || featuredNftIds.has(nft.id))
    .sort(getSort(params.sort))

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize

  return {
    items: filtered.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
    totalPages,
  }
}

export function findNftById(nftId: string) {
  return getNfts().find((nft) => nft.id === nftId)
}

export function parseMockScenario(value: string | null): MockScenario {
  if (value === 'latency' || value === 'error' || value === 'empty') {
    return value
  }

  return 'normal'
}

function matchesValue(actual: string, expected?: string) {
  return !expected || actual === expected
}

function matchesAvailability(
  actual: boolean,
  availability?: NftAvailabilityFilter,
) {
  if (!availability || availability === 'all') {
    return true
  }

  return availability === 'available' ? actual : !actual
}

function getSort(sort: NftSortOption = 'newest') {
  return (left: ReturnType<typeof getNfts>[number], right: ReturnType<typeof getNfts>[number]) => {
    if (sort === 'price-asc') {
      return Number(left.priceEth) - Number(right.priceEth)
    }

    if (sort === 'price-desc') {
      return Number(right.priceEth) - Number(left.priceEth)
    }

    if (sort === 'name-asc') {
      return left.name.localeCompare(right.name)
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  }
}
