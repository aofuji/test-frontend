import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { useLogin, useRegister } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { LoginRequest, RegisterRequest } from '@/api/types/auth'
import { sanitizeRedirect } from '@/auth/routerAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AuthFormOptions = {
  redirect?: string
  onSuccess?: () => void
  onSwitch?: () => void
  switchAction?: ReactNode
  showSwitch?: boolean
}

export function LoginForm({
  redirect,
  onSuccess,
  onSwitch,
  switchAction,
  showSwitch = true,
  showPasswordToggle = false,
}: AuthFormOptions & { showPasswordToggle?: boolean }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const loginMutation = useLogin()
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })
  const [clientErrors, setClientErrors] = useState<Partial<LoginRequest>>({})
  const apiError = loginMutation.error instanceof ApiError ? loginMutation.error : null
  const fieldErrors = { ...clientErrors, ...apiError?.fieldErrors }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLoginForm(form)
    setClientErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(nextErrors.email ? 'auth-login-email' : 'auth-login-password')?.focus()
      return
    }

    loginMutation.mutate(form, {
      onSuccess: () => {
        if (onSuccess) onSuccess()
        else window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <form className="space-y-5" aria-busy={loginMutation.isPending} onSubmit={handleSubmit}>
      <FieldError message={apiError?.message} />
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-login-email">
        <span id="auth-login-email-label" className="sr-only">E-mail</span>
        <Input
          id="auth-login-email"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          value={form.email}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-labelledby="auth-login-email-label"
          aria-describedby={fieldErrors.email ? 'auth-login-email-error' : undefined}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <FieldError id="auth-login-email-error" message={fieldErrors.email} />
      </label>
      <div className="grid gap-2 text-sm font-medium">
        <label className="sr-only" htmlFor="auth-login-password">Senha</label>
        <div className="relative">
          <Input
            id="auth-login-password"
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="************"
            className={showPasswordToggle ? 'pr-10' : undefined}
            value={form.password}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'auth-login-password-error' : undefined}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          {showPasswordToggle ? (
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={passwordVisible}
              aria-controls="auth-login-password"
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </button>
          ) : null}
        </div>
        <FieldError id="auth-login-password-error" message={fieldErrors.password} />
      </div>
      <button type="button" disabled className="auth-mobile-forgot" title="Recuperação de senha indisponível">Esqueceu a senha?</button>
      <Button className="h-11 w-full rounded-sm font-bold" type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
      {showSwitch ? (
        <p className="text-center text-sm text-muted-foreground">
          Ainda nao tem conta?{' '}
          {onSwitch ? <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={onSwitch}>Criar conta</button> : switchAction}
        </p>
      ) : null}
    </form>
  )
}

export function RegisterForm({
  redirect,
  onSuccess,
  onSwitch,
  switchAction,
  showSwitch = true,
  withPasswordConfirmation = false,
  submitLabel = 'Criar conta',
}: AuthFormOptions & { withPasswordConfirmation?: boolean; submitLabel?: string }) {
  const registerMutation = useRegister()
  const [form, setForm] = useState<RegisterRequest>({ name: '', email: '', password: '' })
  const [confirmation, setConfirmation] = useState('')
  const [clientErrors, setClientErrors] = useState<Partial<RegisterRequest> & { confirmation?: string }>({})
  const apiError = registerMutation.error instanceof ApiError ? registerMutation.error : null
  const fieldErrors = { ...clientErrors, ...apiError?.fieldErrors }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Partial<RegisterRequest> & { confirmation?: string } = validateRegisterForm(form)
    if (withPasswordConfirmation && form.password !== confirmation) {
      nextErrors.confirmation = 'As senhas devem ser iguais.'
    }
    setClientErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const field = nextErrors.name ? 'name' : nextErrors.email ? 'email' : nextErrors.password ? 'password' : 'confirmation'
      document.getElementById(`auth-register-${field}`)?.focus()
      return
    }

    registerMutation.mutate(form, {
      onSuccess: () => {
        if (onSuccess) onSuccess()
        else window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <form className="space-y-5" aria-busy={registerMutation.isPending} onSubmit={handleSubmit}>
      <FieldError message={apiError?.message} />
      {registerMutation.isSuccess ? <p role="status" className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">Cadastro realizado. Redirecionando...</p> : null}
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-register-name">
        <span id="auth-register-name-label" className="sr-only">Nome</span>
        <Input id="auth-register-name" aria-labelledby="auth-register-name-label" aria-describedby={fieldErrors.name ? 'auth-register-name-error' : undefined} autoComplete="name" placeholder="Nome de usuário" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <FieldError id="auth-register-name-error" message={fieldErrors.name} />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-register-email">
        <span id="auth-register-email-label" className="sr-only">E-mail</span>
        <Input id="auth-register-email" aria-labelledby="auth-register-email-label" aria-describedby={fieldErrors.email ? 'auth-register-email-error' : undefined} type="email" autoComplete="email" placeholder="Digite seu e-mail" value={form.email} aria-invalid={Boolean(fieldErrors.email)} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <FieldError id="auth-register-email-error" message={fieldErrors.email} />
      </label>
      {withPasswordConfirmation ? (
        <>
          <RegistrationPasswordField
            id="auth-register-password"
            label="Senha"
            value={form.password}
            error={fieldErrors.password}
            onChange={(password) => setForm((current) => ({ ...current, password }))}
          />
          <RegistrationPasswordField
            id="auth-register-confirmation"
            label="Confirmar senha"
            value={confirmation}
            error={clientErrors.confirmation}
            onChange={setConfirmation}
          />
        </>
      ) : (
        <label className="grid gap-2 text-sm font-medium" htmlFor="auth-register-password">
          <span id="auth-register-password-label" className="sr-only">Senha</span>
          <Input id="auth-register-password" aria-labelledby="auth-register-password-label" aria-describedby={fieldErrors.password ? 'auth-register-password-error' : undefined} type="password" autoComplete="new-password" placeholder="Senha" value={form.password} aria-invalid={Boolean(fieldErrors.password)} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <FieldError id="auth-register-password-error" message={fieldErrors.password} />
        </label>
      )}
      <Button className="h-11 w-full rounded-sm font-bold" type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Criando conta...' : submitLabel}
      </Button>
      {showSwitch ? (
        <p className="text-center text-sm text-muted-foreground">
          Ja tem conta?{' '}
          {onSwitch ? <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={onSwitch}>Entrar</button> : switchAction}
        </p>
      ) : null}
    </form>
  )
}

function RegistrationPasswordField({ id, label, value, error, onChange }: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-2 text-sm font-medium">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={label}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function validateLoginForm(form: LoginRequest) {
  const errors: Partial<LoginRequest> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Informe um e-mail valido.'
  if (!form.password) errors.password = 'Informe sua senha.'
  return errors
}

function validateRegisterForm(form: RegisterRequest) {
  const errors: Partial<RegisterRequest> = {}
  if (form.name.trim().length < 2) errors.name = 'Informe seu nome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Informe um e-mail valido.'
  if (form.password.length < 8) errors.password = 'Use pelo menos 8 caracteres.'
  return errors
}

function FieldError({ message, id }: { message?: string; id?: string }) {
  return message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null
}
