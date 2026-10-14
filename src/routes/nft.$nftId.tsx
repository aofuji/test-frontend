import { Link, createFileRoute } from '@tanstack/react-router'

import { useNftDetail } from '../api/hooks/useNfts'
import type { MockScenario } from '../api/types/nft'

type NftDetailSearch = {
  scenario: MockScenario
}

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const { scenario } = Route.useSearch()
  const nftQuery = useNftDetail(nftId, scenario)

  return (
    <section className="page-section detail-layout">
      <div className="detail-media" aria-hidden="true" />
      <div className="page-heading">
        <p className="eyebrow">NFT</p>
        {nftQuery.isLoading ? <h1>Carregando NFT...</h1> : null}

        {nftQuery.isError ? (
          <div className="state-panel inline">
            <h1>Nao foi possivel carregar o NFT</h1>
            <p>{nftQuery.error.message}</p>
            <button
              type="button"
              className="button primary"
              onClick={() => void nftQuery.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {nftQuery.isSuccess ? (
          <>
            <h1>{nftQuery.data.name}</h1>
            <p>{nftQuery.data.description}</p>
            <dl className="metadata-list">
              <div>
                <dt>Criador</dt>
                <dd>{nftQuery.data.creator}</dd>
              </div>
              <div>
                <dt>Colecao</dt>
                <dd>{nftQuery.data.collection}</dd>
              </div>
              <div>
                <dt>Rede</dt>
                <dd>{nftQuery.data.chain}</dd>
              </div>
              <div>
                <dt>Preco</dt>
                <dd>{nftQuery.data.priceEth} ETH</dd>
              </div>
              <div>
                <dt>Disponibilidade</dt>
                <dd>{nftQuery.data.available ? 'Disponivel' : 'Vendido'}</dd>
              </div>
            </dl>
            <div className="edition-list">
              {nftQuery.data.editions.map((edition) => (
                <span key={edition.id}>
                  {edition.label}: {edition.available ? 'disponivel' : 'vendida'}
                </span>
              ))}
            </div>
            <Link to="/cart" className="button primary">
              Ir para o carrinho
            </Link>
          </>
        ) : null}
      </div>
    </section>
  )
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

  return 'normal'
}
