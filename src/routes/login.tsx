import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent, type ReactNode } from 'react'

import { useLogin } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { LoginRequest } from '@/api/types/auth'
import { sanitizeRedirect } from '@/auth/routerAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type LoginSearch = {
  redirect?: string
}

function LoginPage() {
  const { redirect } = Route.useSearch()
  const loginMutation = useLogin()
  const [form, setForm] = useState<LoginRequest>({
    email: '',
    password: '',
  })
  const [clientErrors, setClientErrors] = useState<Partial<LoginRequest>>({})
  const apiError = loginMutation.error instanceof ApiError ? loginMutation.error : null
  const fieldErrors = {
    ...clientErrors,
    ...apiError?.fieldErrors,
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLoginForm(form)
    setClientErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    loginMutation.mutate(form, {
      onSuccess: () => {
        window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <AuthShell eyebrow="Login" title="Acessar conta">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldError message={apiError?.message} />
        <label className="grid gap-2 text-sm font-medium">
          E-mail
          <Input
            type="email"
            autoComplete="email"
            value={form.email}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
          />
          <FieldError message={fieldErrors.email} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Senha
          <Input
            type="password"
            autoComplete="current-password"
            value={form.password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
          <FieldError message={fieldErrors.password} />
        </label>
        <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda nao tem conta?{' '}
          <Link
            to="/register"
            search={redirect ? { redirect } : {}}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Criar cadastro
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function validateLoginForm(form: LoginRequest) {
  const errors: Partial<LoginRequest> = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (!form.password) {
    errors.password = 'Informe sua senha.'
  }

  return errors
}

type AuthShellProps = {
  eyebrow: string
  title: string
  children: ReactNode
}

function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <section className="grid min-h-[65svh] place-items-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-destructive">{message}</p>
}
