import type { ReactNode } from 'react'

import type { Nft } from '@/api/types/nft'
import { MetadataItem, RatingStars } from './nft-information'

type NftSummaryProps = {
  nft: Nft
  onShowReviews: () => void
  children: ReactNode
}

export function NftSummary({ nft, onShowReviews, children }: NftSummaryProps) {
  return (
    <div className="nft-summary">
      <h1>{nft.name}</h1>
      <div className="nft-price-row">
        <p className="nft-price">{nft.priceEth} ETH</p>
        <span className="sr-only">{nft.available ? 'Disponível' : 'Vendido'}</span>
        <button
          type="button"
          className="nft-rating"
          aria-label="Ver avaliações de colecionadores: Sem avaliações disponíveis"
          onClick={onShowReviews}
        >
          <RatingStars />
          <span>Sem avaliações disponíveis</span>
        </button>
      </div>
      <section aria-labelledby="description-heading" className="nft-description">
        <h2 id="description-heading">Sobre este NFT:</h2>
        <p>{nft.description}</p>
      </section>
      {children}
      <dl className="nft-metadata">
        <MetadataItem label="ID do NFT" value={nft.id} />
        <MetadataItem label="Coleção" value={nft.collection} />
        <MetadataItem label="Criador" value={nft.creator} />
        <MetadataItem label="Categoria" value={nft.category} />
      </dl>
    </div>
  )
}
