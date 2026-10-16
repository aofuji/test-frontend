import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import type { MockScenario, Nft } from '@/api/types/nft'
import { Button } from '@/components/ui/button'

type CatalogEditorialProps = {
  items?: Nft[]
  scenario: MockScenario
}

export function CatalogEditorial({ items, scenario }: CatalogEditorialProps) {
  return (
    items && items.length >= 2 ? (

      <section aria-label="Conteúdo complementar" className="grid gap-3 lg:grid-cols-2">

        <EditorialCard nft={items[0]} scenario={scenario} title="Lançamentos gênesis de edição limitada" description="Conheça edições escassas diretamente dos criadores antes da revelação pública." />

        <EditorialCard nft={items[2] ?? items[1]} scenario={scenario} title="Arte digital selecionada e muito mais" description="Explore artistas, coleções verificadas e obras digitais que definem a cultura atual." reverse />

      </section>

    ) : null
  )
}

function EditorialCard({ nft, scenario, title, description, reverse = false }: { nft: Nft; scenario: MockScenario; title: string; description: string; reverse?: boolean }) {

  return (

    <article className="grid overflow-hidden rounded-sm border border-border bg-card sm:grid-cols-2">

      <img src={nft.images[0]?.src} alt="" className={`aspect-square size-full object-cover ${reverse ? 'sm:order-2' : ''}`} />

      <div className="flex flex-col items-start justify-center gap-3 p-4 sm:p-5">

        <h3 className="text-sm font-bold leading-snug sm:text-base">{title}</h3>

        <p className="text-xs leading-5 text-muted-foreground">{description}</p>

        <Button asChild variant="link" className="h-auto p-0 font-bold"><Link to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario }}>Explorar <ArrowRight aria-hidden="true" /></Link></Button>

      </div>

    </article>

  )

}
