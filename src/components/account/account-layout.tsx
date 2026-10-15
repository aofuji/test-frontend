import { Link } from '@tanstack/react-router'
import { BadgePercent, Download, Heart, LogOut, MapPin, ShoppingCart, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useLogout } from '@/api/hooks/useAuth'
import { Button } from '@/components/ui/button'

import './account-layout.css'

const inactiveItems = [
  { label: 'Atividade', icon: ShoppingCart },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: BadgePercent },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: TriangleAlert },
]

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
    <div className="account-layout">
      <aside aria-label="Navegação da conta" className="account-menu">
        <p className="account-menu-title">Meu perfil</p>
        <nav className="account-menu-items" aria-label="Seções da conta">
          <AccountLink to="/profile" active={active === 'profile'} icon={UserRound}>Dados do perfil</AccountLink>
          <AccountLink to="/wallets" active={active === 'wallets'} icon={MapPin}>Carteiras</AccountLink>
          {inactiveItems.map(({ label, icon: Icon }) => (
            <span key={label} aria-disabled="true" title="Disponível em breve" className="account-menu-item">
              <Icon aria-hidden="true" />{label}
            </span>
          ))}
          <Button type="button" variant="ghost" className="account-menu-item account-menu-logout" onClick={signOut} disabled={logout.isPending}>
            <LogOut aria-hidden="true" /> Sair
          </Button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function AccountLink({ to, active, icon: Icon, children }: { to: '/profile' | '/wallets'; active: boolean; icon: LucideIcon; children: ReactNode }) {
  return (
    <Link to={to} className="account-menu-item" aria-current={active ? 'page' : undefined}>
      <Icon aria-hidden="true" />{children}
    </Link>
  )
}
