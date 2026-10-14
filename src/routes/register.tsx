import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent, type ReactNode } from 'react'

import { useRegister } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { RegisterRequest } from '@/api/types/auth'
import { sanitizeRedirect } from '@/auth/routerAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type RegisterSearch = {
  redirect?: string
}

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const registerMutation = useRegister()
  const [form, setForm] = useState<RegisterRequest>({
    name: '',
    email: '',
    password: '',
  })
  const [clientErrors, setClientErrors] = useState<Partial<RegisterRequest>>({})
  const apiError =
    registerMutation.error instanceof ApiError ? registerMutation.error : null
  const fieldErrors = {
    ...clientErrors,
    ...apiError?.fieldErrors,
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateRegisterForm(form)
    setClientErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    registerMutation.mutate(form, {
      onSuccess: () => {
        window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <AuthShell eyebrow="Cadastro" title="Criar conta">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldError message={apiError?.message} />
        {registerMutation.isSuccess ? (
          <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
            Cadastro realizado. Redirecionando...
          </p>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          Nome
          <Input
            autoComplete="name"
            value={form.name}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <FieldError message={fieldErrors.name} />
        </label>
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
            autoComplete="new-password"
            value={form.password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
          <FieldError message={fieldErrors.password} />
        </label>
        <Button
          className="w-full"
          type="submit"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ja tem conta?{' '}
          <Link
            to="/login"
            search={redirect ? { redirect } : {}}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
})

function validateRegisterForm(form: RegisterRequest) {
  const errors: Partial<RegisterRequest> = {}

  if (form.name.trim().length < 2) {
    errors.name = 'Informe seu nome.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (form.password.length < 8) {
    errors.password = 'Use pelo menos 8 caracteres.'
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
