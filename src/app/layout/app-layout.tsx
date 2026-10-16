import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { HomeMobileNav } from "@/components/home/home-mobile-nav";

type AppLayoutProps = {
  isHome: boolean;
  authenticated: boolean;
  cartCount: number;
  favoritesOpen: boolean;
  realtimeNotice: string;
  header: ReactNode;
  authDialog: ReactNode;
  children: ReactNode;
};

export function AppLayout({ isHome, authenticated, cartCount, favoritesOpen, realtimeNotice, header, authDialog, children }: AppLayoutProps) {
  return (
    <div className={`min-h-svh bg-background text-foreground${isHome ? " kurio-home-route" : ""}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-[#281914] focus:p-3 focus:text-[#f5f1eb] focus:outline-2 focus:outline-primary">Pular para o conteúdo</a>
      {header}

      <p role="status" aria-live="polite" className="sr-only">{realtimeNotice}</p>
      <main id="main-content" tabIndex={-1} className="mx-auto min-h-[calc(100svh-160px)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>

      <Footer/>
      {isHome ? <HomeMobileNav authenticated={authenticated} cartCount={cartCount} favoritesOpen={favoritesOpen} /> : null}
      {authDialog}
    </div>
  );
}
