import { Link, createFileRoute } from '@tanstack/react-router'

function RegisterPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Cadastro</p>
      <h1>Criar conta</h1>
      <p>Formulario real sera conectado quando a camada de auth existir.</p>
      <Link to="/login">Ja tenho conta</Link>
    </section>
  )
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})
