import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useNavigate,
} from "@tanstack/react-router";
import {
  LogOut,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLogout, useSession } from "@/api/hooks/useAuth";
import { useCart } from "@/api/hooks/useCart";
import { LoginForm, RegisterForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import type { RouterContext } from "@/router";
import { useRealtime } from "@/realtime/useRealtime";
import "../App.css";
import { Footer } from "@/components/layout/footer";

function RootLayout() {
  const sessionQuery = useSession();
  const cartQuery = useCart();
  const logoutMutation = useLogout();
  useRealtime(sessionQuery.data?.user.id ?? null);
  const navigate = useNavigate();
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
    window.requestAnimationFrame(() => authTriggerRef.current?.focus());
  }

  useEffect(() => {
    if (!authModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAuthModal();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [authModal]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-[#3b2922] bg-[#1b1512]/95 font-mono text-[#f5ede7] backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8">
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
            <Link to="/" search={defaultCatalogSearch} className="rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary" activeProps={{ className: "rounded-sm px-3 py-2 text-xs font-semibold text-primary focus-visible:ring-2 focus-visible:ring-primary" }}>Início</Link>
            <Link to="/" search={defaultCatalogSearch} hash="catalogo" className="rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">Mercado</Link>
            <span className="cursor-pointer rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary" aria-disabled="true" title="Conteúdo em breve">Criadores</span>
            <span className="cursor-pointer rounded-sm px-3 py-2 text-xs font-semibold text-[#d8c9c0] transition hover:text-primary" aria-disabled="true" title="Conteúdo em breve">Aprenda</span>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Pesquisar no mercado"
              className="rounded-sm p-2 text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                void navigate({ to: "/", search: defaultCatalogSearch, hash: "catalogo" });
                window.setTimeout(() => document.querySelector<HTMLInputElement>('[aria-label="Buscar por nome"]')?.focus(), 100);
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
            {logoutMutation.error ? (
              <p role="alert" className="text-sm text-destructive">
                {logoutMutation.error.message} Tente sair novamente.
              </p>
            ) : null}
            {sessionQuery.data ? (
              <>
                <Link to="/profile" className="hidden items-center gap-1 rounded-sm px-2 py-1 text-xs text-[#d8c9c0] transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary sm:flex"><UserRound aria-hidden="true" className="size-4" /><span className="max-w-24 truncate">{sessionQuery.data.user.name}</span></Link>
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
              <Button type="button" size="sm" className="cursor-pointer rounded-sm bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90" onClick={(event) => openAuthModal("login", event.currentTarget)}>Entrar</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100svh-160px)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <Footer/>
      {authModal ? <AuthDialog mode={authModal} onModeChange={setAuthModal} onClose={closeAuthModal} /> : null}
    </div>
  );
}

type AuthModalMode = "login" | "register";

function AuthDialog({ mode, onModeChange, onClose }: { mode: AuthModalMode; onModeChange: (mode: AuthModalMode) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid min-h-svh place-items-center overflow-y-auto bg-black/75 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="relative w-full max-w-[31.25rem] overflow-hidden rounded-sm border border-[#4b2b1e] bg-[#2b1d19] text-[#f3ebe5] shadow-2xl">
        <button ref={closeRef} type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-sm p-1 text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" className="size-5" /></button>
        <div className="px-8 pb-8 pt-9 sm:px-10">
          <div role="tablist" aria-label="Autenticação" className="mb-5 flex justify-center gap-2 text-xl font-semibold">
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => onModeChange("login")} className={`cursor-pointer ${mode === "login" ? "text-primary" : "text-[#f3ebe5]"}`}>Entrar</button>
            <span aria-hidden="true" className="text-[#8d5838]">|</span>
            <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => onModeChange("register")} className={`cursor-pointer ${mode === "register" ? "text-primary" : "text-[#f3ebe5]"}`}>Criar conta</button>
          </div>
          <h2 id="auth-modal-title" className="sr-only">{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          <p className="mx-auto mb-6 max-w-sm text-center text-xs leading-5 text-[#c49c79]">
            {mode === "login" ? "Entre para gerenciar sua carteira, coleção e perfil de criador." : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
          </p>
          {mode === "login" ? <LoginForm showSwitch={false} onSuccess={onClose} /> : <RegisterForm showSwitch={false} onSuccess={onClose} />}
          <div className="my-5 flex items-center gap-3 text-xs text-[#c49c79]"><span className="h-px flex-1 bg-[#4b2b1e]" /><span>Ou continue com</span><span className="h-px flex-1 bg-[#4b2b1e]" /></div>
          <div className="grid gap-3">
            <Button type="button" variant="outline" disabled aria-disabled="true" className="h-10 w-full justify-center rounded-sm border-[#4b2b1e] text-[#c49c79] disabled:opacity-100">Continuar com Google</Button>
            <Button type="button" variant="outline" disabled aria-disabled="true" className="h-10 w-full justify-center rounded-sm border-[#4b2b1e] text-[#c49c79] disabled:opacity-100">Continuar com Facebook</Button>
          </div>
        </div>
        <div className="h-2 bg-primary" aria-hidden="true" />
      </div>
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
