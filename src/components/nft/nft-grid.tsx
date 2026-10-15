import type { MockScenario, Nft } from '@/api/types/nft'
import { NFTCard } from '@/components/nft/nft-card'

type NFTGridProps = {
  nfts: Nft[]
  scenario: MockScenario
}

export function NFTGrid({ nfts, scenario }: NFTGridProps) {
  return (
    <div className="grid gap-x-4 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
      {nfts.map((nft) => (
        <NFTCard key={nft.id} nft={nft} scenario={scenario} />
      ))}
    </div>
  )
}
