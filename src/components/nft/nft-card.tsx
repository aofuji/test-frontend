import { getNftImageSrc, restoreNftImageFallback } from '@/features/nft/model/nft-image-variants'
import { Link } from '@tanstack/react-router'

import type { MockScenario, Nft } from '@/api/types/nft'

type NFTCardProps = {
  nft: Nft
  scenario: MockScenario
}

export function NFTCard({ nft, scenario }: NFTCardProps) {
  return (
    <article className="flex min-w-0 flex-col gap-2 text-left font-mono">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        search={{ scenario }}
        aria-label={`Abrir ${nft.name}`}
        className="flex aspect-[258/300] items-center bg-[#281914] p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        {nft.images[0] ? (
          <img src={getNftImageSrc(nft.images[0].src)} onError={(event) => { restoreNftImageFallback(event.currentTarget, nft.images[0].src) }} alt={nft.images[0].alt} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
        ) : (
          <span className="grid aspect-square w-full place-items-center rounded-2xl p-3 text-center text-sm text-muted-foreground">Imagem indisponível</span>
        )}
      </Link>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-normal leading-5 text-[#f5f1eb] sm:text-base">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }} title={nft.name} className="outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">{nft.name}</Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-base leading-6 sm:text-lg">
          <span className="font-bold text-[#d28a4c]">{nft.priceEth} ETH</span>
          {nft.previousPriceEth && Number(nft.previousPriceEth) > Number(nft.priceEth) ? (
            <span className="font-normal text-[#b39463]">
              <span className="sr-only">Preço anterior: </span>{nft.previousPriceEth} ETH
            </span>
          ) : null}
        </p>
        <span className="sr-only">{nft.available ? 'Disponível' : 'Vendido'} · {nft.chain} · {nft.creator}</span>
      </div>
    </article>
  )
}
