import { Link, useLinkProps } from "@tanstack/react-router";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { defaultCatalogSearch } from "@/features/catalog/model/defaults";
import { Button } from "@/components/ui/button";
import { HeaderSearch, HomeMobileSearch } from "./header-search";

type AppHeaderProps = {
  isHome: boolean;
  homeActive: boolean;
  marketActive: boolean;
  filtersOpen: boolean;
  searchQuery?: string;
  authenticated: boolean;
  userName?: string;
  cartCount: number;
  onSearch: (query: string) => Promise<void>;
  onOpenFilters: () => void;
  onLogin: (trigger: HTMLButtonElement) => void;
};

export function AppHeader({ isHome, homeActive, marketActive, filtersOpen, searchQuery, authenticated, userName, cartCount, onSearch, onOpenFilters, onLogin }: AppHeaderProps) {
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
    await onSearch(searchDraft ?? searchQuery ?? "");
    closeSearch();
    document.getElementById("catalogo")?.scrollIntoView({ block: "start" });
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
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
                setSearchDraft(searchQuery ?? "");
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
          {authenticated ? (
            <Link to="/profile" className="hidden items-center gap-1 rounded-sm px-2 py-1 text-xs text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary sm:flex"><UserRound aria-hidden="true" className="size-4" /><span className="max-w-24 truncate">{userName}</span></Link>
          ) : (
            <Button type="button" size="sm" className="cursor-pointer rounded-sm bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90" onClick={(event) => onLogin(event.currentTarget)}>Entrar</Button>
          )}
        </div>
      </div>
      {isHome ? (
        <HomeMobileSearch
          value={searchDraft ?? searchQuery ?? ""}
          onValueChange={setSearchDraft}
          onSubmit={(event) => void submitSearch(event)}
          onReset={() => setSearchDraft(null)}
          filtersOpen={filtersOpen}
          onOpenFilters={onOpenFilters}
        />
      ) : null}
      {searchOpen ? (
        <HeaderSearch
          value={searchDraft ?? searchQuery ?? ""}
          onValueChange={setSearchDraft}
          onSubmit={(event) => void submitSearch(event)}
          inputRef={searchInputRef}
          onClose={closeSearch}
        />
      ) : null}
    </header>
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
