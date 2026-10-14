import { Link, createFileRoute } from '@tanstack/react-router'

const sampleNfts = [
  {
    id: 'aurora-001',
    name: 'Aurora Chain #001',
    creator: 'Studio Atlas',
    price: '1.20 ETH',
  },
  {
    id: 'neon-204',
    name: 'Neon District #204',
    creator: 'Mina Vault',
    price: '0.84 ETH',
  },
  {
    id: 'orbit-512',
    name: 'Orbit Memory #512',
    creator: 'Collective Nova',
    price: '2.10 ETH',
  },
]

function HomePage() {
  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">Catalogo</p>
        <h1>NFTs em destaque</h1>
        <p>
          Estrutura inicial de navegacao para o marketplace. Os cards abaixo
          sao provisórios e existem apenas para validar as rotas.
        </p>
      </div>

      <div className="nft-grid">
        {sampleNfts.map((nft) => (
          <article className="nft-card" key={nft.id}>
            <div className="nft-art" aria-hidden="true" />
            <div>
              <h2>{nft.name}</h2>
              <p>{nft.creator}</p>
            </div>
            <div className="card-footer">
              <strong>{nft.price}</strong>
              <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                Ver detalhes
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
