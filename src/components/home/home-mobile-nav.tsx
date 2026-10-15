import { Link, useLinkProps } from '@tanstack/react-router'
import { Heart, House, ShoppingCart, UserRound } from 'lucide-react'

export function HomeMobileNav({ authenticated, cartCount, favoritesOpen }: { authenticated: boolean; cartCount: number; favoritesOpen: boolean }) {
  const homeLink = useLinkProps({ from: '/', to: '/', search: (previous) => previous, hash: '', activeProps: {} })
  const favoritesLink = useLinkProps({ from: '/', to: '/', search: (previous) => previous, hash: 'favoritos', activeProps: {} })
  return (
    <nav className="home-mobile-nav" aria-label="Navegação inferior">
      <a {...homeLink} aria-label="Início" aria-current={!favoritesOpen ? "page" : undefined} data-status={!favoritesOpen ? "active" : undefined} data-selected={!favoritesOpen}>
        <House aria-hidden="true" />
      </a>
      {authenticated ? (
        <a {...favoritesLink} id="home-mobile-favorites" aria-label="Favoritos" aria-current={favoritesOpen ? "page" : undefined} data-status={favoritesOpen ? "active" : undefined} data-selected={favoritesOpen} aria-haspopup="dialog" aria-expanded={favoritesOpen} aria-controls="home-mobile-favorites-panel">
          <Heart aria-hidden="true" />
        </a>
      ) : (
        <Link id="home-mobile-favorites" to="/login" search={{ redirect: '/#favoritos' }} aria-label="Favoritos"><Heart aria-hidden="true" /></Link>
      )}
      <Link to="/cart" aria-label={`Carrinho${cartCount ? `, ${cartCount} itens` : ' vazio'}`}><ShoppingCart aria-hidden="true" />{cartCount ? <span className="home-mobile-cart-count">{cartCount}</span> : null}</Link>
      <Link to="/profile" aria-label="Perfil"><UserRound aria-hidden="true" /></Link>
    </nav>
  )
}
