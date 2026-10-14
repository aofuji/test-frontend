import { Link, createFileRoute } from '@tanstack/react-router'
import { LockKeyhole } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function CheckoutPage() {
  return (
    <section className="grid min-h-[55svh] place-items-center">
      <Card className="max-w-xl">
        <CardContent className="space-y-5 p-8">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Checkout
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Finalizacao da compra
            </h1>
            <p className="text-muted-foreground">
              Fluxo de checkout sera implementado em uma etapa posterior. Esta
              rota ja exige sessao ativa.
            </p>
          </div>
          <Button asChild>
            <Link to="/orders/$orderId" params={{ orderId: 'preview-order' }}>
              Ver pedido de exemplo
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => context.auth.ensureSession(location),
  component: CheckoutPage,
})
