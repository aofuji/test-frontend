import { Plug, PlugZap, WalletCards } from 'lucide-react'

import type { Wallet } from '@/api/types/wallet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type WalletCardActions = {
  isUpdating: boolean
  onEdit: (wallet: Wallet) => void
  onToggleConnection: (wallet: Wallet) => void
  onSetPrimary: (wallet: Wallet) => void
  onSimulateDecline: (wallet: Wallet) => void
}

type WalletCardProps = WalletCardActions & {
  wallet: Wallet
}

export function WalletCard({ wallet, isUpdating, onEdit, onToggleConnection, onSetPrimary, onSimulateDecline }: WalletCardProps) {
  return (
    <Card className="wallets-saved-card">
      <CardContent className="grid gap-4 p-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:items-start">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <WalletCards aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{wallet.label}</h2>
            {wallet.isDefault ? <Badge>Principal</Badge> : null}
            <Badge variant="outline">{wallet.network}</Badge>
            <Badge
              variant={
                wallet.status === 'connected' ? 'secondary' : 'outline'
              }
            >
              {wallet.status === 'connected' ? 'Conectada' : 'Desconectada'}
            </Badge>
          </div>
          <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {wallet.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button
            variant="outline"
            onClick={() => onEdit(wallet)}
          >
            Editar {wallet.label}
          </Button>
          <Button
            variant="outline"
            onClick={() => onToggleConnection(wallet)}
            disabled={isUpdating}
          >
            {wallet.status === 'connected' ? (
              <Plug className="size-4" aria-hidden="true" />
            ) : (
              <PlugZap className="size-4" aria-hidden="true" />
            )}
            {wallet.status === 'connected' ? 'Desconectar' : 'Conectar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onSetPrimary(wallet)}
            disabled={wallet.isDefault || isUpdating}
          >
            Definir principal
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSimulateDecline(wallet)}
            disabled={isUpdating}
          >
            Simular recusa
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
