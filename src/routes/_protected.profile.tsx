import { createFileRoute } from '@tanstack/react-router'

function ProfilePage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Perfil</p>
      <h1>Perfil do colecionador</h1>
      <p>Rota preparada para protecao quando a autenticacao for integrada.</p>
    </section>
  )
}

export const Route = createFileRoute('/_protected/profile')({
  component: ProfilePage,
})
