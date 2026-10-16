import { Link } from '@tanstack/react-router'

import type { useSession } from '@/api/hooks/useAuth'
import type { useFavorites } from '@/api/hooks/useFavorites'
import type { useCatalogInventory } from '@/components/catalog/use-catalog-nfts'
import { FilterPanel } from '@/components/catalog/filter-panel'
import { SortSelect } from '@/components/catalog/sort-select'
import { HomeMobilePanel } from '@/components/home/home-mobile-panel'
import { NFTGrid } from '@/components/nft/nft-grid'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import type { CatalogFilterState, CatalogSearch } from '../model/types'

type CatalogMobilePanelsProps = {
  search: CatalogSearch
  hash: string
  session: ReturnType<typeof useSession>
  favorites: ReturnType<typeof useFavorites>
  inventoryQuery: ReturnType<typeof useCatalogInventory>
  onFiltersChange: (patch: Partial<CatalogFilterState>) => void
  onClosePanel: () => void
}

export function CatalogMobilePanels({ search, hash, session, favorites, inventoryQuery, onFiltersChange, onClosePanel }: CatalogMobilePanelsProps) {
  const favoriteNfts = inventoryQuery.data?.filter((nft) => favorites.data?.includes(nft.id)) ?? []

  return (
    <>
      <HomeMobilePanel open={hash === 'filtros'} onClose={onClosePanel} title="Filtros e ordenação" triggerId="home-mobile-filters">
        <div className="mb-6"><SortSelect value={search.sort} onChange={(sort) => onFiltersChange({ sort })} /></div>
        <FilterPanel value={search} onChange={onFiltersChange} items={inventoryQuery.data ?? []} loading={inventoryQuery.isPending} error={inventoryQuery.isError} onRetry={() => void inventoryQuery.refetch()} />
      </HomeMobilePanel>
      <HomeMobilePanel open={hash === 'favoritos'} onClose={onClosePanel} title="Favoritos" triggerId="home-mobile-favorites">
        {session.isPending || (session.data && (favorites.isPending || inventoryQuery.isPending)) ? <LoadingSkeleton count={2} /> : null}
        {!session.isPending && !session.data ? <p className="text-sm">Entre para acessar seus favoritos. <Link to="/login" search={{ redirect: '/#favoritos' }} className="text-primary underline">Entrar</Link></p> : null}
        {session.data && (favorites.isError || inventoryQuery.isError) ? <p role="alert" className="text-sm">Não foi possível carregar os favoritos. <button type="button" className="underline" onClick={() => { void favorites.refetch(); void inventoryQuery.refetch() }}>Tentar novamente</button></p> : null}
        {session.data && favorites.isSuccess && inventoryQuery.isSuccess ? (
          favoriteNfts.length ? <NFTGrid nfts={favoriteNfts} scenario={search.scenario} /> : <p className="text-sm text-muted-foreground">Você ainda não tem NFTs favoritos. Use o coração nos detalhes de um NFT para salvá-lo.</p>
        ) : null}
      </HomeMobilePanel>
    </>
  )
}
