import type { ReactNode } from 'react'
import { ShoppingCart } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CartStateCard({
  title,
  description,
  action,
  role = 'status',
}: {
  role?: 'status' | 'alert'
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card role={role} className="border-dashed">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShoppingCart aria-hidden="true" className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          {action}
        </div>
      </CardContent>
    </Card>
  )
}

export function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="cart-layout cart-skeleton">
      <span className="sr-only">Carregando carrinho...</span>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="cart-item">
            <CardContent className="cart-skeleton-item">
              <Skeleton className="cart-skeleton-image" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-56 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
              <Skeleton className="h-10 w-20 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 rounded-sm" />
    </div>
  )
}
