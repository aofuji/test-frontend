import { createFileRoute } from '@tanstack/react-router'

import type { MockScenario } from '@/api/types/nft'
import { defaultCatalogSearch } from '@/features/catalog/model/defaults'
import { NftDetailPage } from '@/features/nft/components/nft-detail-page'

import './nft-mobile.css'

type NftDetailSearch = {
  scenario: MockScenario
}

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const { scenario } = Route.useSearch()

  return <NftDetailPage nftId={nftId} scenario={scenario} />
}

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: (search: Record<string, unknown>): NftDetailSearch => ({
    scenario: getScenario(search.scenario),
  }),
  component: NftDetailsPage,
})

function getScenario(value: unknown): MockScenario {
  if (value === 'latency' || value === 'error' || value === 'empty') {
    return value
  }

  return defaultCatalogSearch.scenario
}
