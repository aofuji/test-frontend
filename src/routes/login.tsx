import { Link, createFileRoute } from '@tanstack/react-router'

function LoginPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Login</p>
      <h1>Acessar conta</h1>
      <p>Tela provisoria para futura autenticacao do colecionador.</p>
      <Link to="/register">Criar cadastro</Link>
    </section>
  )
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})
