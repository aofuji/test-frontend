import { Link, createFileRoute } from '@tanstack/react-router'

import { RegisterForm } from '@/features/auth/components/auth-forms'
import { AuthMobileSwitch, AuthSocialOptions } from '@/features/auth/components/auth-mobile'
import { useMobileAuth } from '@/components/auth/use-mobile-auth'
import { AuthShell } from '@/features/auth/components/auth-shell'

type RegisterSearch = {
  redirect?: string
}

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const mobile = useMobileAuth()

  return (
    <AuthShell eyebrow="Cadastro" title={<><span className="auth-desktop-title">Criar conta</span><span className="auth-mobile-title">Criar perfil de colecionador</span></>} className="auth-route-register">
      <RegisterForm
        redirect={redirect}
        withPasswordConfirmation={mobile}
        submitLabel={mobile ? 'Criar perfil' : 'Criar conta'}
        showSwitch={!mobile}
        switchAction={
          <Link to="/login" search={redirect ? { redirect } : {}} className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        }
      />
      <div className="auth-mobile-extras">
        <AuthSocialOptions />
        <AuthMobileSwitch register><Link to="/login" search={redirect ? { redirect } : {}}>Entre</Link></AuthMobileSwitch>
      </div>
    </AuthShell>
  )
}

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
})
