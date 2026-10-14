import { createFileRoute } from '@tanstack/react-router'

function WalletsPage() {
  return (
    <section className="page-section compact">
      <p className="eyebrow">Carteiras</p>
      <h1>Gerenciamento de carteiras</h1>
      <p>Rota privada futura para conectar e administrar carteiras.</p>
    </section>
  )
}

export const Route = createFileRoute('/_protected/wallets')({
  component: WalletsPage,
})
