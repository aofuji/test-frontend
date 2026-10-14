import { Link, createFileRoute } from '@tanstack/react-router'

import { useNfts } from '../api/hooks/useNfts'
import type {
  MockScenario,
  NftAvailabilityFilter,
  NftListParams,
  NftSortOption,
} from '../api/types/nft'

type CatalogSearch = {
  q?: string
  category?: string
  chain?: string
  availability: NftAvailabilityFilter
  sort: NftSortOption
  page: number
  scenario: MockScenario
}

const pageSize = 6

const categories = [
  { value: '', label: 'Todas categorias' },
  { value: 'art', label: 'Arte' },
  { value: 'generative', label: 'Generativo' },
  { value: 'photography', label: 'Fotografia' },
  { value: 'pixel', label: 'Pixel art' },
]

const chains = [
  { value: '', label: 'Todas redes' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'base', label: 'Base' },
]

const availabilityOptions: Array<{
  value: NftAvailabilityFilter
  label: string
}> = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponiveis' },
  { value: 'sold', label: 'Vendidos' },
]

const sortOptions: Array<{ value: NftSortOption; label: string }> = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Menor preco' },
  { value: 'price-desc', label: 'Maior preco' },
  { value: 'name-asc', label: 'Nome A-Z' },
]

const scenarioOptions: Array<{ value: MockScenario; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'latency', label: 'Latencia' },
  { value: 'error', label: 'Erro 500' },
  { value: 'empty', label: 'Vazio' },
]

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const params: NftListParams = {
    search: search.q,
    category: search.category,
    chain: search.chain,
    availability: search.availability,
    sort: search.sort,
    page: search.page,
    pageSize,
    scenario: search.scenario,
  }
  const nftsQuery = useNfts(params)

  function updateFilters(patch: Partial<CatalogSearch>) {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: 1,
      }),
    })
  }

  function updatePage(page: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page,
      }),
    })
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">Catalogo</p>
        <h1>NFTs em destaque</h1>
        <p>
          Listagem provisoria integrada a uma API REST simulada com Axios,
          TanStack Query e MSW.
        </p>
      </div>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Buscar por nome
          <input
            value={search.q ?? ''}
            onChange={(event) =>
              updateFilters({ q: event.currentTarget.value || undefined })
            }
            placeholder="Aurora, Neon..."
          />
        </label>

        <label>
          Categoria
          <select
            value={search.category ?? ''}
            onChange={(event) =>
              updateFilters({
                category: event.currentTarget.value || undefined,
              })
            }
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Rede
          <select
            value={search.chain ?? ''}
            onChange={(event) =>
              updateFilters({ chain: event.currentTarget.value || undefined })
            }
          >
            {chains.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Disponibilidade
          <select
            value={search.availability}
            onChange={(event) =>
              updateFilters({
                availability: event.currentTarget
                  .value as NftAvailabilityFilter,
              })
            }
          >
            {availabilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ordenacao
          <select
            value={search.sort}
            onChange={(event) =>
              updateFilters({ sort: event.currentTarget.value as NftSortOption })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cenario MSW
          <select
            value={search.scenario}
            onChange={(event) =>
              updateFilters({
                scenario: event.currentTarget.value as MockScenario,
              })
            }
          >
            {scenarioOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {nftsQuery.isLoading ? <p className="state-message">Carregando NFTs...</p> : null}

      {nftsQuery.isError ? (
        <div className="state-panel">
          <h2>Nao foi possivel carregar os NFTs</h2>
          <p>{nftsQuery.error.message}</p>
          <button
            type="button"
            className="button primary"
            onClick={() => void nftsQuery.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {nftsQuery.isSuccess && nftsQuery.data.items.length === 0 ? (
        <div className="state-panel">
          <h2>Nenhum NFT encontrado</h2>
          <p>Ajuste a busca ou os filtros para ver outros resultados.</p>
        </div>
      ) : null}

      {nftsQuery.data && nftsQuery.data.items.length > 0 ? (
        <>
          <div className="result-summary">
            <span>{nftsQuery.data.total} NFTs encontrados</span>
            {nftsQuery.isFetching ? <span>Atualizando...</span> : null}
          </div>

          <div className="nft-grid">
            {nftsQuery.data.items.map((nft) => (
              <article className="nft-card" key={nft.id}>
                <div className="nft-art" aria-hidden="true" />
                <div>
                  <h2>{nft.name}</h2>
                  <p>{nft.creator}</p>
                  <p className="muted">
                    {nft.collection} · {nft.chain}
                  </p>
                </div>
                <div className="card-footer">
                  <strong>{nft.priceEth} ETH</strong>
                  <Link
                    to="/nft/$nftId"
                    params={{ nftId: nft.id }}
                    search={{ scenario: search.scenario }}
                  >
                    Ver detalhes
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="pagination">
            <button
              type="button"
              className="button secondary"
              disabled={search.page <= 1}
              onClick={() => updatePage(search.page - 1)}
            >
              Anterior
            </button>
            <span>
              Pagina {nftsQuery.data.page} de {nftsQuery.data.totalPages}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={search.page >= nftsQuery.data.totalPages}
              onClick={() => updatePage(search.page + 1)}
            >
              Proxima
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: getOptionalString(search.q),
    category: getOptionalString(search.category),
    chain: getOptionalString(search.chain),
    availability: getAvailability(search.availability),
    sort: getSort(search.sort),
    page: getPage(search.page),
    scenario: getScenario(search.scenario),
  }),
  component: HomePage,
})

function getOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getPage(value: unknown) {
  const page = Number(value)

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function getAvailability(value: unknown): NftAvailabilityFilter {
  if (value === 'available' || value === 'sold') {
    return value
  }

  return 'all'
}

function getSort(value: unknown): NftSortOption {
  if (value === 'price-asc' || value === 'price-desc' || value === 'name-asc') {
    return value
  }

  return 'newest'
}

function getScenario(value: unknown): MockScenario {
  if (value === 'latency' || value === 'error' || value === 'empty') {
    return value
  }

  return 'normal'
}
