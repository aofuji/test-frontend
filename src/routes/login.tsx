import { Link, createFileRoute } from '@tanstack/react-router'

import { LoginForm } from '@/features/auth/components/auth-forms'
import { AuthMobileSwitch, AuthSocialOptions } from '@/features/auth/components/auth-mobile'
import { useMobileAuth } from '@/components/auth/use-mobile-auth'
import { AuthShell } from '@/features/auth/components/auth-shell'

type LoginSearch = {
  redirect?: string
}

function LoginPage() {
  const { redirect } = Route.useSearch()
  const mobile = useMobileAuth()

  return (
    <AuthShell eyebrow="Login" title="Entrar">
      <LoginForm
        redirect={redirect}
        showPasswordToggle={mobile}
        showSwitch={!mobile}
        switchAction={
          <Link to="/register" search={redirect ? { redirect } : {}} className="font-medium text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        }
      />
      <div className="auth-mobile-extras">
        <AuthSocialOptions />
        <AuthMobileSwitch register={false}><Link to="/register" search={redirect ? { redirect } : {}}>Crie uma conta</Link></AuthMobileSwitch>
      </div>
    </AuthShell>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})
