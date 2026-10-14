import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import type { MockScenario, Nft } from '@/api/types/nft'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { FavoriteButton } from './favorite-button'

type NFTCardProps = {
  nft: Nft
  scenario: MockScenario
}

export function NFTCard({ nft, scenario }: NFTCardProps) {
  return (
    <Card className="group overflow-visible rounded-sm bg-transparent p-0 ring-0">
      <div className="relative overflow-hidden rounded-sm bg-card ring-1 ring-border">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          search={{ scenario }}
          aria-label={`Abrir ${nft.name}`}
          className="block aspect-square outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          {nft.images[0] ? (
            <img src={nft.images[0].src} alt={nft.images[0].alt} className="size-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          ) : (
            <span className="grid size-full place-items-center text-sm text-muted-foreground">Imagem indisponível</span>
          )}
        </Link>
        <span className="absolute left-3 top-3"><Badge variant={nft.available ? 'default' : 'secondary'}>{nft.available ? nft.chain : 'Vendido'}</Badge></span>
        <span className="absolute right-3 top-3"><FavoriteButton nftId={nft.id} name={nft.name} /></span>
      </div>

      <CardContent className="flex items-end justify-between gap-3 px-0 pt-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{nft.name}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{nft.creator}</p>
          <p className="mt-1 font-mono text-base font-bold text-primary">{nft.priceEth} ETH</p>
        </div>
        <Button asChild size="icon-sm" variant="ghost" className="rounded-sm text-primary">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }} aria-label={`Detalhes de ${nft.name}`}>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
