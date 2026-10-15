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
    if (Object.keys(nextErrors).length > 0) return

    loginMutation.mutate(form, {
      onSuccess: () => {
        if (onSuccess) onSuccess()
        else window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldError message={apiError?.message} />
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-login-email">
        <span className="sr-only">E-mail</span>
        <Input
          id="auth-login-email"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          value={form.email}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <FieldError message={fieldErrors.email} />
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
        <FieldError message={fieldErrors.password} />
      </div>
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
}: AuthFormOptions & { withPasswordConfirmation?: boolean }) {
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
    if (Object.keys(nextErrors).length > 0) return

    registerMutation.mutate(form, {
      onSuccess: () => {
        if (onSuccess) onSuccess()
        else window.location.assign(sanitizeRedirect(redirect))
      },
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldError message={apiError?.message} />
      {registerMutation.isSuccess ? <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">Cadastro realizado. Redirecionando...</p> : null}
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-register-name">
        <span className="sr-only">Nome</span>
        <Input id="auth-register-name" autoComplete="name" placeholder="Nome de usuário" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <FieldError message={fieldErrors.name} />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="auth-register-email">
        <span className="sr-only">E-mail</span>
        <Input id="auth-register-email" type="email" autoComplete="email" placeholder="Digite seu e-mail" value={form.email} aria-invalid={Boolean(fieldErrors.email)} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <FieldError message={fieldErrors.email} />
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
          <span className="sr-only">Senha</span>
          <Input id="auth-register-password" type="password" autoComplete="new-password" placeholder="Senha" value={form.password} aria-invalid={Boolean(fieldErrors.password)} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <FieldError message={fieldErrors.password} />
        </label>
      )}
      <Button className="h-11 w-full rounded-sm font-bold" type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Criando conta...' : 'Criar conta'}
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

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}
