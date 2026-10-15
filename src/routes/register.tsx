import { Link, createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { RegisterForm } from '@/components/auth/auth-forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RegisterSearch = {
  redirect?: string
}

function RegisterPage() {
  const { redirect } = Route.useSearch()

  return (
    <AuthShell eyebrow="Cadastro" title="Criar conta">
      <RegisterForm
        redirect={redirect}
        switchAction={
          <Link to="/login" search={redirect ? { redirect } : {}} className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        }
      />
    </AuthShell>
  )
}

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
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
