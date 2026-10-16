import { Star } from 'lucide-react'

import type { Nft } from '@/api/types/nft'

export type NftInfoTab = 'details' | 'reviews'

type NftInformationProps = {
  nft: Nft
  activeInfoTab: NftInfoTab
  setActiveInfoTab: (tab: NftInfoTab) => void
}

export function NftInformation({ nft, activeInfoTab, setActiveInfoTab }: NftInformationProps) {
  return (
    <section aria-label="Informações do NFT" className="nft-information">
      <div role="tablist" aria-label="Detalhes e avaliações" className="nft-tabs" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        const current = tabs.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
        tabs[next]?.click()
        tabs[next]?.focus()
      }}>
        <button id="nft-details-tab" type="button" role="tab" tabIndex={activeInfoTab === 'details' ? 0 : -1} aria-controls="nft-info-panel" aria-selected={activeInfoTab === 'details'} onClick={() => setActiveInfoTab('details')}>Detalhes do NFT</button>
        <button id="nft-reviews-tab" type="button" role="tab" tabIndex={activeInfoTab === 'reviews' ? 0 : -1} aria-controls="nft-info-panel" aria-selected={activeInfoTab === 'reviews'} onClick={() => setActiveInfoTab('reviews')}>Avaliações de colecionadores</button>
      </div>
      <div id="nft-info-panel" role="tabpanel" tabIndex={0} aria-labelledby={activeInfoTab === 'details' ? 'nft-details-tab' : 'nft-reviews-tab'} className="nft-info-panel focus-visible:outline-2 focus-visible:outline-primary">
        {activeInfoTab === 'details' ? (
          <>
            <p>{nft.description}</p>
            <dl className="nft-detail-facts">
              <MetadataItem label="Rede" value={nft.chain} />
              <MetadataItem label="Criador" value={nft.creator} />
              <MetadataItem label="Disponibilidade" value={nft.available ? 'Disponível' : 'Vendido'} />
            </dl>
          </>
        ) : (
          <div className="nft-reviews-empty">
            <RatingStars />
            <h2>Nenhuma avaliação disponível</h2>
            <p>Não há avaliações de colecionadores disponíveis para este NFT.</p>
          </div>
        )}
      </div>
    </section>
  )
}

type MetadataItemProps = {
  label: string
  value: string
}

export function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div>
      <dt>{label}:</dt>{' '}
      <dd>{value}</dd>
    </div>
  )
}

// Decorative, unfilled stars indicate that no rating data is available.
export function RatingStars() {
  return (
    <span className="nft-rating-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} />)}
    </span>
  )
}
