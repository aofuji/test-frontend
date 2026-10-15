import { Link, createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { LoginForm } from '@/components/auth/auth-forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type LoginSearch = {
  redirect?: string
}

function LoginPage() {
  const { redirect } = Route.useSearch()

  return (
    <AuthShell eyebrow="Login" title="Entrar">
      <LoginForm
        redirect={redirect}
        switchAction={
          <Link to="/register" search={redirect ? { redirect } : {}} className="font-medium text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        }
      />
    </AuthShell>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="grid min-h-[65svh] place-items-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <CardTitle className="text-3xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}
