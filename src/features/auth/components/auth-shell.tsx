import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthMobileBrand } from './auth-mobile'

export function AuthShell({ eyebrow, title, children, className }: {
  eyebrow: string
  title: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`auth-route${className ? ` ${className}` : ''} grid min-h-[65svh] place-items-center py-8`}>
      <AuthMobileBrand />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <CardTitle className="text-3xl"><h1>{title}</h1></CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}
