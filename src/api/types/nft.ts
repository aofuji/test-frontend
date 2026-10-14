export type NftAvailabilityFilter = 'all' | 'available' | 'sold'

export type NftSortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc'

export type MockScenario = 'normal' | 'latency' | 'error' | 'empty'

export type NftEdition = {
  id: string
  label: string
  available: boolean
  stock?: number
}

export type NftImage = {
  src: string
  alt: string
  label: string
}

export type Nft = {
  id: string
  version?: number
  name: string
  creator: string
  collection: string
  description: string
  category: string
  chain: string
  priceEth: string
  available: boolean
  images: NftImage[]
  editions: NftEdition[]
  createdAt: string
}

export type NftListParams = {
  search?: string
  category?: string
  chain?: string
  availability?: NftAvailabilityFilter
  sort?: NftSortOption
  page?: number
  pageSize?: number
  featuredOnly?: boolean
  scenario?: MockScenario
}

export type NftListResponse = {
  items: Nft[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
