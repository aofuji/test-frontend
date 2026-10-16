import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutMobileHeading } from './checkout-mobile-heading'

export function CheckoutLoading() {
  return (
    <section className="checkout-page checkout-loading" aria-label="Carregando checkout" aria-busy="true">
      <CheckoutMobileHeading />
      <Skeleton className="h-10 w-64" />
      <div className="checkout-layout">
        <Skeleton className="h-96" />
        <Skeleton className="h-80" />
      </div>
    </section>
  )
}

export function CheckoutStateCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <section className="checkout-page checkout-state grid min-h-[55svh] place-items-center">
      <CheckoutMobileHeading />
      <Card className="max-w-xl">
        <CardContent className="space-y-5 p-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {action}
        </CardContent>
      </Card>
    </section>
  )
}
