import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { LogOut, ShoppingBag, UserRound, WalletCards } from 'lucide-react'

import { useLogout, useSession } from '@/api/hooks/useAuth'
import { Button } from '@/components/ui/button'
import type { RouterContext } from '@/router'
import '../App.css'

const navigationItems = [
  { to: '/', label: 'Catalogo' },
  { to: '/cart', label: 'Carrinho' },
  { to: '/profile', label: 'Perfil' },
  { to: '/wallets', label: 'Carteiras' },
]

function RootLayout() {
  const sessionQuery = useSession()
  const logoutMutation = useLogout()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link
            to="/"
            search={defaultCatalogSearch}
            className="flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <ShoppingBag aria-hidden="true" className="size-5" />
            </span>
            NFT Market
          </Link>
          <nav
            className="flex flex-wrap items-center gap-1"
            aria-label="Navegacao principal"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{
                  className:
                    'rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {logoutMutation.error ? (
              <p role="alert" className="text-sm text-destructive">
                {logoutMutation.error.message} Tente sair novamente.
              </p>
            ) : null}
            {sessionQuery.data ? (
              <>
                <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
                  {sessionQuery.data.user.name}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    logoutMutation.mutate(undefined, {
                      onSuccess: () => {
                        window.dispatchEvent(new Event('nft-marketplace:logout'))
                        window.location.assign('/')
                      },
                    })
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/login">
                    <UserRound aria-hidden="true" />
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/register">
                    <WalletCards aria-hidden="true" />
                    Cadastro
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100svh-160px)] w-full max-w-screen-2xl px-5 py-8 lg:px-10 lg:py-12">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-10">
          <span>Marketplace de NFTs</span>
          <span>Design system preparado para o layout final do Figma.</span>
        </div>
      </footer>
    </div>
  )
}

function NotFoundPage() {
  return (
    <section className="grid min-h-[55svh] place-items-center text-center">
      <div className="max-w-md space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          404
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Rota nao encontrada
        </h1>
        <p className="text-muted-foreground">
          O endereco acessado nao existe neste marketplace.
        </p>
        <Button asChild>
          <Link to="/" search={defaultCatalogSearch}>
            Voltar ao catalogo
          </Link>
        </Button>
      </div>
    </section>
  )
}

const defaultCatalogSearch = {
  availability: 'all',
  sort: 'newest',
  page: 1,
  scenario: 'normal',
} as const

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
