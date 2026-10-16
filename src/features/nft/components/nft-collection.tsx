import { getNftImageSrc, restoreNftImageFallback } from '@/features/nft/model/nft-image-variants'
import { Link } from '@tanstack/react-router'

import type { useNfts } from '@/api/hooks/useNfts'
import type { MockScenario } from '@/api/types/nft'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

type NftCollectionProps = {
  collectionQuery: ReturnType<typeof useNfts>
  scenario: MockScenario
  setCollectionPage: (page: number) => void
}

export function NftCollection({ collectionQuery, scenario, setCollectionPage }: NftCollectionProps) {
  return (
    <section aria-labelledby="collection-heading" className="nft-collection">
      <h2 id="collection-heading">Mais desta coleção</h2>
      {collectionQuery.isLoading ? <LoadingSkeleton count={5} /> : null}
      {collectionQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar outros NFTs desta coleção.</p> : null}
      {collectionQuery.data?.items.length ? (
        <div id="nft-collection-items" className="nft-collection-grid" aria-busy={collectionQuery.isFetching}>
          {collectionQuery.data.items.map((item) => (
            <Link key={item.id} to="/nft/$nftId" params={{ nftId: item.id }} search={{ scenario }} className="group min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="nft-collection-image">
                {item.images[0] ? <img src={getNftImageSrc(item.images[0].src)} onError={(event) => { restoreNftImageFallback(event.currentTarget, item.images[0].src) }} alt={item.images[0].alt} className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-xs text-muted-foreground">Imagem indisponível</span>}
              </div>
              <p className="mt-3 text-sm leading-tight">{item.name}</p>
              <p className="font-mono text-base font-bold leading-tight text-primary">{item.priceEth} ETH</p>
            </Link>
          ))}
        </div>
      ) : null}
      {collectionQuery.data && collectionQuery.data.totalPages > 1 ? (
        <nav aria-label="Páginas de Mais desta coleção" className="nft-collection-pagination">
          {Array.from({ length: collectionQuery.data.totalPages }, (_, index) => {
            const page = index + 1
            return (
              <button
                key={page}
                type="button"
                aria-label={`Ir para página ${page} da coleção`}
                aria-current={collectionQuery.data.page === page ? 'page' : undefined}
                aria-controls="nft-collection-items"
                onClick={() => setCollectionPage(page)}
              />
            )
          })}
        </nav>
      ) : null}
      <p className="sr-only" role="status">
        {collectionQuery.isFetching ? 'Carregando NFTs da coleção.' : collectionQuery.data ? `Página ${collectionQuery.data.page} de ${collectionQuery.data.totalPages} da coleção.` : ''}
      </p>
    </section>
  )
}
