import { Link } from '@tanstack/react-router'

import type { NftListResponse } from '@/api/types/nft'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'

type CartRecommendationsProps = {
  data?: NftListResponse
  isPending: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
  onPageChange: (page: number) => void
}

export function CartRecommendations({ data, isPending, isError, isFetching, onRetry, onPageChange }: CartRecommendationsProps) {
  return (
    <section className="cart-related" aria-labelledby="cart-related-heading" aria-busy={isFetching}>
      <h2 id="cart-related-heading">Colecionadores também viram</h2>
      {isPending ? <LoadingSkeleton count={5} className="cart-related-grid" /> : null}
      {isError ? (
        <div role="alert">
          <p>Não foi possível carregar os NFTs do catálogo.</p>
          <Button type="button" variant="link" onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : null}
      {data ? (
        <>
          <div id="cart-related-items" className="cart-related-grid">
            {data.items.map((nft) => (
              <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }} search={{ scenario: 'normal' }}>
                <div className="cart-related-image">
                  {nft.images[0] ? <img src={nft.images[0].src} alt={nft.images[0].alt} loading="lazy" /> : <span>Imagem indisponível</span>}
                </div>
                <p>{nft.name}</p>
                <p className="cart-related-price">{nft.priceEth} ETH</p>
              </Link>
            ))}
          </div>
          {data.items.length === 0 ? <p>Nenhum NFT disponível no catálogo.</p> : null}
          {data.totalPages > 1 ? (
            <nav className="cart-related-pages" aria-label="Páginas de Colecionadores também viram">
              {Array.from({ length: data.totalPages }, (_, index) => (
                <button key={index} type="button" aria-label={`Ver página ${index + 1} de NFTs`} aria-controls="cart-related-items" aria-current={data.page === index + 1 ? 'page' : undefined} onClick={() => onPageChange(index + 1)} />
              ))}
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
