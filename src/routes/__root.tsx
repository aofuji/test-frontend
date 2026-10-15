import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useLocation,
  useLinkProps,
  useSearch,
} from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { AuthMobileBrand, AuthMobileSwitch, AuthSocialOptions } from "@/components/auth/auth-mobile";
import { useMobileAuth } from "@/components/auth/use-mobile-auth";
import "@/components/auth/login-dialog.css";

import { useSession } from "@/api/hooks/useAuth";
import { useCart } from "@/api/hooks/useCart";
import { LoginForm, RegisterForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RouterContext } from "@/router";
import { useRealtime } from "@/realtime/useRealtime";
import "../App.css";
import { Footer } from "@/components/layout/footer";
import { HomeMobileNav } from "@/components/home/home-mobile-nav";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState<string | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  function closeSearch() {
    setSearchOpen(false);
    setSearchDraft(null);
    searchTriggerRef.current?.focus({ preventScroll: true });
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await navigate({
      to: "/",
      search: (previous) => ({ ...defaultCatalogSearch, ...previous, q: (searchDraft ?? search.q ?? "").trim() || undefined, page: 1 }),
      hash: "catalogo",
    });
    closeSearch();
    document.getElementById("catalogo")?.scrollIntoView({ block: "start" });
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  const [authModal, setAuthModal] = useState<AuthModalMode | null>(null);
  const authTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cartCount = cartQuery.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

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
    <div className={`min-h-svh bg-background text-foreground${isHome ? " kurio-home-route" : ""}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-[#281914] focus:p-3 focus:text-[#f5f1eb] focus:outline-2 focus:outline-primary">Pular para o conteúdo</a>
      <header className="sticky top-0 z-30 border-b border-[#3b2922] bg-[#1b1512]/95 font-mono text-[#f5ede7] backdrop-blur">
        <div className="desktop-header-row mx-auto flex min-h-16 max-w-7xl items-center gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            search={defaultCatalogSearch}
            className="shrink-0 text-base font-black tracking-[0.22em] text-[#f5ede7] outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            KURIO
          </Link>
          <nav
            className="mx-auto flex items-center gap-1 whitespace-nowrap"
            aria-label="Navegação principal"
          >
            <HeaderNavLink active={homeActive}>Início</HeaderNavLink>
            <HeaderNavLink active={marketActive} hash="catalogo">Mercado</HeaderNavLink>
            <span className="cursor-pointer rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary" aria-disabled="true" title="Conteúdo em breve">Criadores</span>
            <span className="cursor-pointer rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary" aria-disabled="true" title="Conteúdo em breve">Aprenda</span>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              ref={searchTriggerRef}
              aria-label="Pesquisar no mercado"
              aria-expanded={searchOpen}
              aria-controls="catalog-search"
              className="rounded-sm p-2 text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                if (searchOpen) closeSearch();
                else {
                  setSearchDraft(search.q ?? "");
                  setSearchOpen(true);
                }
              }}
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
            <Link
              to="/cart"
              aria-label={`Carrinho${cartCount ? `, ${cartCount} ${cartCount === 1 ? "item" : "itens"}` : " vazio"}`}
              className="relative rounded-sm p-2 text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ShoppingCart aria-hidden="true" className="size-4" />
              {cartCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{cartCount}</span> : null}
            </Link>
            {sessionQuery.data ? (
              <Link to="/profile" className="hidden items-center gap-1 rounded-sm px-2 py-1 text-xs text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary sm:flex"><UserRound aria-hidden="true" className="size-4" /><span className="max-w-24 truncate">{sessionQuery.data.user.name}</span></Link>
            ) : (
              <Button type="button" size="sm" className="cursor-pointer rounded-sm bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90" onClick={(event) => openAuthModal("login", event.currentTarget)}>Entrar</Button>
            )}
          </div>
        </div>
        {isHome ? (
          <form role="search" aria-label="Busca mobile de NFTs" className="home-mobile-search" onSubmit={(event) => void submitSearch(event)}>
            <div className="home-mobile-search-field">
              <button type="submit" aria-label="Aplicar busca mobile"><Search aria-hidden="true" /></button>
              <label htmlFor="home-mobile-search-input" className="sr-only">Buscar NFTs pelo nome</label>
              <Input id="home-mobile-search-input" type="search" enterKeyHint="search" placeholder="Explorar coleções" value={searchDraft ?? search.q ?? ""} onChange={(event) => setSearchDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") { setSearchDraft(null); event.currentTarget.blur(); } }} />
            </div>
            <button id="home-mobile-filters" type="button" className="home-mobile-filter-button" aria-label="Abrir filtros" aria-haspopup="dialog" aria-expanded={locationHash === "filtros"} aria-controls="home-mobile-filters-panel" onClick={() => void navigate({ to: "/", search: (previous) => ({ ...defaultCatalogSearch, ...previous }), hash: "filtros" })}><SlidersHorizontal aria-hidden="true" /></button>
          </form>
        ) : null}
        {searchOpen ? (
          <form
            id="catalog-search"
            role="search"
            aria-label="Busca de NFTs"
            onSubmit={(event) => void submitSearch(event)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              }
            }}
            className="border-t border-[#3b2922] px-4 py-3 sm:px-6 lg:px-8"
          >
            <div className="mx-auto flex w-full max-w-xl items-center gap-2">
              <label htmlFor="catalog-search-input" className="sr-only">Buscar NFTs pelo nome</label>
              <Input
                ref={searchInputRef}
                id="catalog-search-input"
                type="search"
                enterKeyHint="search"
                value={searchDraft ?? search.q ?? ""}
                onChange={(event) => setSearchDraft(event.currentTarget.value)}
                placeholder="Buscar NFTs pelo nome"
                className="h-10 min-w-0 flex-1 rounded-sm border-primary/25 bg-card"
              />
              <Button type="submit" size="icon" aria-label="Aplicar busca" className="size-10 rounded-sm">
                <Search aria-hidden="true" className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar busca" onClick={closeSearch} className="size-10 rounded-sm">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </form>
        ) : null}
      </header>

      <p role="status" aria-live="polite" className="sr-only">{realtimeNotice}</p>
      <main id="main-content" tabIndex={-1} className="mx-auto min-h-[calc(100svh-160px)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <Footer/>
      {isHome ? <HomeMobileNav authenticated={Boolean(sessionQuery.data)} cartCount={cartCount} favoritesOpen={locationHash === "favoritos"} /> : null}
      {authModal ? <AuthDialog mode={authModal} onModeChange={setAuthModal} onClose={closeAuthModal} /> : null}
    </div>
  );
}

function HeaderNavLink({ active, hash, children }: { active: boolean; hash?: string; children: ReactNode }) {
  const linkProps = useLinkProps({ to: "/", search: defaultCatalogSearch, hash, activeProps: {} });
  return (
    <a
      {...linkProps}
      aria-current={active ? "page" : undefined}
      data-status={active ? "active" : undefined}
      className={`flex min-h-16 items-center border-b-2 px-3 py-2 text-xs font-semibold transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary ${active ? "border-[#d28a4c] text-[#d28a4c]" : "border-transparent text-[#d8c9c0]"}`}
    >
      {children}
    </a>
  );
}

type AuthModalMode = "login" | "register";

function AuthDialog({ mode, onModeChange, onClose }: { mode: AuthModalMode; onModeChange: (mode: AuthModalMode) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const mobile = useMobileAuth();



  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Overlay asChild>
    <div data-register-dialog={mode === "register" ? "true" : undefined} data-login-dialog={mode === "login" ? "true" : undefined} className="fixed inset-0 z-50 grid min-h-svh place-items-center overflow-y-auto bg-black/75 p-4 sm:p-8">
      <Dialog.Content asChild onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }} onCloseAutoFocus={(event) => event.preventDefault()} aria-labelledby="auth-modal-title" aria-describedby="auth-modal-description">
      <div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="relative w-full max-w-[31.25rem] overflow-hidden rounded-sm border border-[#4b2b1e] bg-[#2b1d19] text-[#f3ebe5] shadow-2xl">
        <AuthMobileBrand />
        <button ref={closeRef} type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-sm p-1 text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" className="size-5" /></button>
        <div className="px-8 pb-8 pt-9 sm:px-10">
          <div role="tablist" aria-label="Autenticação" className="mb-5 flex justify-center gap-2 text-xl font-semibold" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
            const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
          }}>
            <button type="button" id="auth-login-tab" role="tab" tabIndex={mode === "login" ? 0 : -1} aria-controls="auth-form-panel" aria-selected={mode === "login"} onClick={() => onModeChange("login")} className={`cursor-pointer ${mode === "login" ? "text-primary" : "text-[#f3ebe5]"}`}>Entrar</button>
            <span aria-hidden="true" className="text-[#8d5838]">|</span>
            <button type="button" id="auth-register-tab" role="tab" tabIndex={mode === "register" ? 0 : -1} aria-controls="auth-form-panel" aria-selected={mode === "register"} onClick={() => onModeChange("register")} className={`cursor-pointer ${mode === "register" ? "text-primary" : "text-[#f3ebe5]"}`}>Criar conta</button>
          </div>
          <Dialog.Title asChild><h2 id="auth-modal-title" className="sr-only">{mode === "login" ? "Entrar" : mobile ? "Criar perfil de colecionador" : "Criar conta"}</h2></Dialog.Title>
          <Dialog.Description asChild><p id="auth-modal-description" className="mx-auto mb-6 max-w-sm text-center text-xs leading-5 text-[#c49c79]">
            {mode === "login" ? "Entre para gerenciar sua carteira, coleção e perfil de criador." : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
          </p></Dialog.Description>
          <div id="auth-form-panel" role="tabpanel" aria-labelledby={mode === "login" ? "auth-login-tab" : "auth-register-tab"}>
          {mode === "login" ? <LoginForm showSwitch={false} showPasswordToggle onSuccess={onClose} /> : <RegisterForm showSwitch={false} withPasswordConfirmation submitLabel={mobile ? "Criar perfil" : "Criar conta"} onSuccess={onClose} />}
          <AuthSocialOptions />
          <AuthMobileSwitch register={mode === "register"}><button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>{mode === "login" ? "Crie uma conta" : "Entre"}</button></AuthMobileSwitch>
          </div>
        </div>
        <div className="h-2 bg-primary" aria-hidden="true" />
      </div>
      </Dialog.Content>
    </div>
    </Dialog.Overlay>
    </Dialog.Root>
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
