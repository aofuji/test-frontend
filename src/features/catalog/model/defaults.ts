import type { CatalogFilterState } from './types'

export const defaultCatalogSearch = {
  availability: 'all',
  sort: 'newest',
  page: 1,
  scenario: 'normal',
} as const satisfies CatalogFilterState & { page: number }
