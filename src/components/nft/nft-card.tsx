import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import type { MockScenario, Nft } from '@/api/types/nft'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type NFTCardProps = {
  nft: Nft
  scenario: MockScenario
}

export function NFTCard({ nft, scenario }: NFTCardProps) {
  return (
    <Card className="group overflow-hidden border-border/80 bg-card/95 p-0 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className={cn('nft-art-surface', getArtworkClass(nft.category))}>
        <div className="absolute inset-4 rounded-2xl border border-white/20" />
        <span className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {nft.chain}
        </span>
      </div>

      <CardHeader className="p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="line-clamp-1 text-lg">{nft.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{nft.creator}</p>
          </div>
          <Badge variant={nft.available ? 'default' : 'secondary'}>
            {nft.available ? 'Disponivel' : 'Vendido'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-3">
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {nft.collection}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 p-5 pt-0">
        <div>
          <span className="text-xs text-muted-foreground">Preco atual</span>
          <p className="font-mono text-lg font-semibold text-foreground">
            {nft.priceEth} ETH
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            search={{ scenario }}
          >
            Detalhes
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function getArtworkClass(category: string) {
  if (category === 'photography') {
    return 'from-sky-950 via-cyan-700 to-lime-300'
  }

  if (category === 'generative') {
    return 'from-fuchsia-950 via-indigo-700 to-amber-300'
  }

  if (category === 'pixel') {
    return 'from-slate-950 via-emerald-700 to-orange-300'
  }

  return 'from-zinc-950 via-violet-700 to-rose-300'
}
