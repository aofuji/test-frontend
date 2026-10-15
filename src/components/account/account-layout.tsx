import { Link } from '@tanstack/react-router'
import { LogOut, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'

import { useLogout } from '@/api/hooks/useAuth'
import { Button } from '@/components/ui/button'

const inactiveItems = ['Atividade', 'Lista de interesse', 'Ofertas', 'Arquivos baixados', 'Suporte']

export function AccountLayout({ active, children }: { active: 'profile' | 'wallets'; children: ReactNode }) {
  const logout = useLogout()

  function signOut() {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.dispatchEvent(new Event('nft-marketplace:logout'))
        window.location.assign('/')
      },
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Navegação da conta" className="self-start rounded-sm border border-border/80 bg-card/60 p-3 lg:sticky lg:top-24">
        <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">Minha conta</p>
        <nav className="flex gap-1 overflow-x-auto lg:grid lg:gap-1" aria-label="Seções da conta">
          <AccountLink to="/profile" active={active === 'profile'}>Dados do perfil</AccountLink>
          <AccountLink to="/wallets" active={active === 'wallets'}>Carteiras</AccountLink>
          {inactiveItems.map((item) => <span key={item} aria-disabled="true" title="Disponível em breve" className="shrink-0 rounded-sm px-3 py-2 text-xs text-muted-foreground">{item}</span>)}
          <Button type="button" variant="ghost" className="justify-start gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary" onClick={signOut} disabled={logout.isPending}>
            <LogOut aria-hidden="true" className="size-3.5" /> Sair
          </Button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function AccountLink({ to, active, children }: { to: '/profile' | '/wallets'; active: boolean; children: ReactNode }) {
  return <Link to={to} className={active ? 'flex shrink-0 items-center gap-2 rounded-sm bg-primary/15 px-3 py-2 text-xs font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary' : 'flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary'}>
    {to === '/wallets' ? <WalletCards aria-hidden="true" className="size-3.5" /> : null}{children}
  </Link>
}
