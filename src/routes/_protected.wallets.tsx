import { createFileRoute } from '@tanstack/react-router'
import { WalletCards } from 'lucide-react'

import { useSession } from '@/api/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'

function WalletsPage() {
  const sessionQuery = useSession()
  const walletAddress = sessionQuery.data?.user.walletAddress

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Carteiras
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Gerenciamento de carteiras
        </h1>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <WalletCards aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Carteira principal</h2>
            <p className="break-all text-muted-foreground">
              {walletAddress ?? 'Nenhuma carteira conectada nesta conta mock.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export const Route = createFileRoute('/_protected/wallets')({
  component: WalletsPage,
})
