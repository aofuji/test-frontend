import { Link, createFileRoute } from '@tanstack/react-router'

function NftDetailsPage() {
  const { nftId } = Route.useParams()

  return (
    <section className="page-section detail-layout">
      <div className="detail-media" aria-hidden="true" />
      <div className="page-heading">
        <p className="eyebrow">NFT</p>
        <h1>Detalhes do NFT</h1>
        <p>
          Pagina provisoria para o item <strong>{nftId}</strong>. A integracao
          com API e estado de compra entrara em etapas futuras.
        </p>
        <Link to="/cart" className="button primary">
          Ir para o carrinho
        </Link>
      </div>
    </section>
  )
}

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailsPage,
})
