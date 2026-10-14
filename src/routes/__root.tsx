import { Link, Outlet, createRootRoute } from '@tanstack/react-router'

import '../App.css'

const navigationItems = [
  { to: '/', label: 'Catalogo' },
  { to: '/cart', label: 'Carrinho' },
  { to: '/profile', label: 'Perfil' },
  { to: '/wallets', label: 'Carteiras' },
]

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" search={defaultCatalogSearch} className="brand">
          NFT Market
        </Link>
        <nav className="site-nav" aria-label="Navegacao principal">
          {navigationItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-link"
              activeProps={{ className: 'nav-link active' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="auth-actions">
          <Link to="/login" className="button secondary">
            Login
          </Link>
          <Link to="/register" className="button primary">
            Cadastro
          </Link>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>Marketplace de NFTs</span>
        <span>Preparado para Query, Axios, MSW e autenticacao futura.</span>
      </footer>
    </div>
  )
}

function NotFoundPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">404</p>
      <h1>Rota nao encontrada</h1>
      <p>O endereco acessado nao existe neste marketplace.</p>
      <Link to="/" search={defaultCatalogSearch} className="button primary">
        Voltar ao catalogo
      </Link>
    </section>
  )
}

const defaultCatalogSearch = {
  availability: 'all',
  sort: 'newest',
  page: 1,
  scenario: 'normal',
} as const

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
