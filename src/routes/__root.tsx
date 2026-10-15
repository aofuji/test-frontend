import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import {
  Home,
  LogOut,
  ShoppingCart,
  UserRound,
  WalletCards,
} from "lucide-react";

import { useLogout, useSession } from "@/api/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { RouterContext } from "@/router";
import { useRealtime } from "@/realtime/useRealtime";
import "../App.css";
import { Footer } from "@/components/layout/footer";

const navigationItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/cart", label: "Carrinho", icon: ShoppingCart },
  { to: "/profile", label: "Perfil", icon: UserRound },
];

function RootLayout() {
  const sessionQuery = useSession();
  const logoutMutation = useLogout();
  const realtimeNotice = useRealtime(sessionQuery.data?.user.id ?? null);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 font-mono backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            to="/"
            search={defaultCatalogSearch}
            className="text-sm font-black tracking-[0.18em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            KURIO
          </Link>
          <nav
            className="order-3 flex min-w-0 w-full items-center justify-between gap-1 overflow-x-auto border-t border-border pt-2 sm:order-none sm:w-auto sm:border-0 sm:pt-0"
            aria-label="Navegacao principal"
          >
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-1.5 border-b border-transparent px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  activeProps={{
                    className:
                      "flex items-center gap-1.5 border-b border-primary px-2 py-1.5 text-xs font-semibold text-primary",
                  }}
                >
                  <Icon aria-hidden="true" className="size-3.5 sm:hidden" />
                  {item.label}
                </Link>
              );
            })}
            <span
              className="cursor-default whitespace-nowrap border-b border-transparent px-2 py-1.5 text-xs font-semibold text-muted-foreground"
              title="Conteúdo em breve"
            >
              Aprenda
            </span>
          </nav>
          <div className="flex max-w-full min-w-0 items-center gap-2">
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
                  size="sm"
                  className="rounded-sm"
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    logoutMutation.mutate(undefined, {
                      onSuccess: () => {
                        window.dispatchEvent(
                          new Event("nft-marketplace:logout"),
                        );
                        window.location.assign("/");
                      },
                    });
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-sm"
                >
                  <Link to="/login" aria-label="Login">
                    <UserRound aria-hidden="true" />
                    <span className="max-[260px]:sr-only">Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-sm">
                  <Link to="/register" aria-label="Cadastro">
                    <WalletCards aria-hidden="true" />
                    <span className="max-[260px]:sr-only">Cadastro</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100svh-160px)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {realtimeNotice ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-5 rounded-lg border bg-muted px-4 py-3 text-sm"
          >
            {realtimeNotice}
          </p>
        ) : null}
        <Outlet />
      </main>

      <Footer/>
    </div>
  );
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
  );
}

const defaultCatalogSearch = {
  availability: "all",
  sort: "newest",
  page: 1,
  scenario: "normal",
} as const;

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
