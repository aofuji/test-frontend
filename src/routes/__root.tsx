import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useLocation,
  useSearch,
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppHeader } from "@/app/layout/app-header";
import { AppLayout } from "@/app/layout/app-layout";
import { defaultCatalogSearch } from "@/features/catalog/model/defaults";
import { AuthDialog, type AuthModalMode } from "@/features/auth/components/auth-dialog";
import "@/components/auth/login-dialog.css";

import { useSession } from "@/api/hooks/useAuth";
import { useCart } from "@/api/hooks/useCart";
import { Button } from "@/components/ui/button";
import type { RouterContext } from "@/router";
import { useRealtime } from "@/realtime/useRealtime";
import "../App.css";
import "@/components/home/home-mobile.css";

function RootLayout() {
  const sessionQuery = useSession();
  const cartQuery = useCart();
  const realtimeNotice = useRealtime(sessionQuery.data?.user.id ?? null);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname }).replace(/\/+$/, "") || "/";
  const isHome = pathname === "/";
  const locationHash = useLocation({ select: (location) => location.hash });
  const marketActive = pathname === "/cart" || pathname === "/checkout" || /^\/(nft|orders)(\/|$)/.test(pathname);
  const homeActive = pathname === "/" || pathname === "/profile" || pathname === "/wallets";
  const search = useSearch({ strict: false });
  const [authModal, setAuthModal] = useState<AuthModalMode | null>(null);
  const authTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cartCount = cartQuery.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  async function searchCatalog(query: string) {
    await navigate({
      to: "/",
      search: (previous) => ({ ...defaultCatalogSearch, ...previous, q: query.trim() || undefined, page: 1 }),
      hash: "catalogo",
    });
  }

  function openFilters() {
    void navigate({ to: "/", search: (previous) => ({ ...defaultCatalogSearch, ...previous }), hash: "filtros" });
  }

  function openAuthModal(mode: AuthModalMode, trigger: HTMLButtonElement) {
    authTriggerRef.current = trigger;
    setAuthModal(mode);
    void navigate({ to: "/", search: defaultCatalogSearch });
  }

  function closeAuthModal() {
    setAuthModal(null);
    window.requestAnimationFrame(() => {
      const trigger = authTriggerRef.current;
      if (trigger?.getClientRects().length) trigger.focus();
      else Array.from(document.querySelectorAll<HTMLAnchorElement>('header a[href="/profile"], .home-mobile-nav a[href="/profile"]')).find((link) => link.getClientRects().length)?.focus();
    });
  }

  return (
    <AppLayout
      isHome={isHome}
      authenticated={Boolean(sessionQuery.data)}
      cartCount={cartCount}
      favoritesOpen={locationHash === "favoritos"}
      realtimeNotice={realtimeNotice}
      header={
        <AppHeader
          isHome={isHome}
          homeActive={homeActive}
          marketActive={marketActive}
          filtersOpen={locationHash === "filtros"}
          searchQuery={search.q}
          authenticated={Boolean(sessionQuery.data)}
          userName={sessionQuery.data?.user.name}
          cartCount={cartCount}
          onSearch={searchCatalog}
          onOpenFilters={openFilters}
          onLogin={(trigger) => openAuthModal("login", trigger)}
        />
      }
      authDialog={authModal ? <AuthDialog mode={authModal} onModeChange={setAuthModal} onClose={closeAuthModal} /> : null}
    >
      <Outlet />
    </AppLayout>
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

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
